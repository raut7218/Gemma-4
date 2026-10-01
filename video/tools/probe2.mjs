import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.cwd();
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.json') ? 'application/json' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
await new Promise((r) => srv.on('listening', r));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`http://127.0.0.1:${srv.address().port}/film.html${process.argv[2] || ''}`);
await pg.waitForFunction(() => window.__READY);
const r = await pg.evaluate(new Function('return (' + (process.argv[3] || '() => 0') + ')()'));
console.log(JSON.stringify(r, null, 1));
const cdp = await pg.context().newCDPSession(pg);
for (const T of [0.5, 4.5]) {
  let t0 = Date.now(), n = 30;
  for (let i = 0; i < n; i++) await pg.evaluate((t) => FILM.seek(t), T + i / 60);
  const seekMs = (Date.now() - t0) / n; t0 = Date.now();
  for (let i = 0; i < n; i++) await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
  console.log(`t=${T}: seek ${seekMs.toFixed(1)} ms, capture ${((Date.now() - t0) / n).toFixed(1)} ms`);
}
await b.close(); srv.close();
