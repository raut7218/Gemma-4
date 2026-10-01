// Frame-exact renderer: seeks the gsap timeline for every frame and pipes
// screenshots to ffmpeg. Usage:
//   node tools/render.mjs --out out/test.mp4 [--from 0] [--to 5] [--fps 60]
//        [--scenes test.js,cube.mjs] [--workers 4] [--still 2.5,3.0 --stilldir out/stills]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const FPS = Number(args.fps || 60);
const WORKERS = Number(args.workers || 4);
const CHROME = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  const q = args.scenes ? `?scenes=${args.scenes}` : '';
  await page.goto(`http://127.0.0.1:${port}/film.html${q}`);
  await page.waitForFunction(() => window.__READY === true, null, { timeout: 180000 });
  return page;
}

async function renderRange(browser, port, from, to, file) {
  const page = await openPage(browser, port);
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cdp = await page.context().newCDPSession(page);
  for (let n = n0; n < n1; n++) {
    await page.evaluate((t) => FILM.seek(t), n / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if ((n - n0) % 600 === 0) console.log(`[${path.basename(file)}] frame ${n - n0}/${n1 - n0}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await page.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const srv = await serve();
const port = srv.address().port;
const t0 = Date.now();

if (args.probe) {
  // list the elements visible at the given times: id, position, opacity, text
  const page = await openPage(browser, port);
  for (const t of String(args.probe).split(',').map(Number)) {
    const rows = await page.evaluate((tt) => {
      FILM.seek(tt);
      const out = [];
      for (const id in FILM.EL) {
        const r = FILM.EL[id], n = r.node || r.el || r.dom;
        if (!n || !n.getBoundingClientRect) continue;
        const cs = getComputedStyle(n); if (cs.display === 'none' || +cs.opacity < 0.03 || cs.visibility === 'hidden') continue;
        const b = n.getBoundingClientRect(); if (b.right < 0 || b.left > 1920 || b.bottom < 0 || b.top > 1080 || b.width * b.height < 4) continue;
        out.push(`${id} [${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}] o=${(+cs.opacity).toFixed(2)} ${(n.innerText || '').replace(/\s+/g, ' ').slice(0, 40)}`);
      }
      return out;
    }, t);
    console.log(`t=${t}`); rows.forEach((r) => console.log('  ' + r));
  }
  await page.close();
} else if (args.still) {
  // render named times as PNG stills
  const page = await openPage(browser, port);
  console.log('duration', await page.evaluate(() => FILM.duration));
  fs.mkdirSync(args.stilldir || 'out/stills', { recursive: true });
  for (const t of String(args.still).split(',').map(Number)) {
    await page.evaluate((tt) => FILM.seek(tt), t);
    await page.screenshot({ path: path.join(args.stilldir || 'out/stills', `t${t.toFixed(2).padStart(7, '0')}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  }
  await page.close();
} else {
  const info = await (async () => { const p = await openPage(browser, port); const d = await p.evaluate(() => ({ dur: FILM.duration, ch: FILM.CHAPTERS, cues: FILM.CUES })); await p.close(); return d; })();
  const from = Number(args.from || 0), to = Number(args.to || info.dur);
  fs.writeFileSync(path.join(ROOT, 'out', 'timeline.json'), JSON.stringify(info, null, 1));
  console.log(`duration ${info.dur.toFixed(2)} s; rendering ${from}-${to} with ${WORKERS} workers`);
  const out = path.resolve(args.out || 'out/render.mp4');
  const span = to - from, nW = Math.max(1, Math.min(WORKERS, Math.ceil(span / 4)));
  const parts = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rend-'));
  // split on whole frames
  const frames = Math.round(span * FPS), per = Math.ceil(frames / nW);
  const jobs = [];
  for (let w = 0; w < nW; w++) {
    const a = from + (w * per) / FPS, b = from + Math.min(frames, (w + 1) * per) / FPS;
    if (b <= a) continue;
    const f = path.join(tmp, `part${w}.mp4`);
    parts.push(f);
    jobs.push(renderRange(browser, port, a, b, f));
  }
  await Promise.all(jobs);
  fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map((p) => `file '${p}'`).join('\n'));
  await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close();
srv.close();
