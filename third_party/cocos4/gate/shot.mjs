// 用法：node third_party/cocos4/gate/shot.mjs <dir> <out.png> [/index.html?fmt=rgba8]
// Serve <dir> statically, open in headless Chromium (WebGL2 via SwiftShader/ANGLE), screenshot, exit.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.argv[2] || path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const out = process.argv[3] || path.join(root, 'shot.png');
const page_ = process.argv[4] || '/index.html';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const extra = process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(' ') : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ headless: true, args: [...extra, '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:${port}${page_}`);
try {
  await page.waitForFunction(() => window.__READY__ || window.__ERR__, null, { timeout: 30000 });
} catch (e) { logs.push('[timeout] ' + e.message); }
await page.waitForTimeout(500);
const err = await page.evaluate(() => window.__ERR__ || null);
await page.screenshot({ path: out });
console.log(logs.filter(l => !/^\[log\] \[\d/.test(l)).slice(0, 80).join('\n'));
console.log('ERR:', err);
console.log('screenshot:', out);
await browser.close();
server.close();
