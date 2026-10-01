import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.cwd();
const MT = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MT[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
await new Promise((r) => srv.on('listening', r));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: (process.env.ARGS || '--use-angle=swiftshader --enable-unsafe-swiftshader').split(' ') });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`http://127.0.0.1:${srv.address().port}/film.html`);
await pg.waitForFunction(() => window.__READY);
const cdp = await pg.context().newCDPSession(pg);
async function bench(label, opts, T = 1.0) {
  const n = 30; const t0 = Date.now();
  for (let i = 0; i < n; i++) { await pg.evaluate((t) => FILM.seek(t), T + i / 60); await cdp.send('Page.captureScreenshot', opts); }
  console.log(label, ((Date.now() - t0) / n).toFixed(1), 'ms/frame');
}
await bench('jpeg q93 speed', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
await bench('jpeg q80', { format: 'jpeg', quality: 80, optimizeForSpeed: true });
await bench('png speed', { format: 'png', optimizeForSpeed: true });
await bench('webp', { format: 'webp', quality: 95, optimizeForSpeed: true });
await pg.evaluate(() => { document.getElementById('vignette').style.display = 'none'; });
await bench('no vignette jpeg', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
await pg.evaluate(() => { document.getElementById('bg').style.display = 'none'; });
await bench('no bg jpeg', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
await bench('no bg jpeg (3d)', { format: 'jpeg', quality: 93, optimizeForSpeed: true }, 4.5);
await b.close(); srv.close();
