// 本地预览 site/（纯静态，不缓存）。用法：node serve.js [port]
// 开发便利：/dev/<id>/ 直接映射到仓库内 games/<id>/index.html（本站自制游戏改完刷新即见，不用先跑 fetch）
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'site');
const DEV = path.join(__dirname, 'games');
const PORT = Number(process.argv[2] || 8795);
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const API = Number(process.env.API_PORT || 8796);
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) { // 开发时把英雄榜 API 反代到本机 server/scores.mjs（node server/scores.mjs）
    const pr = http.request({ host: '127.0.0.1', port: API, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    pr.on('error', () => { res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"ok":false,"error":"api not running (node server/scores.mjs)"}'); });
    req.pipe(pr); return;
  }
  let u = decodeURIComponent(req.url.split('?')[0]);
  let base = ROOT;
  if (u.startsWith('/dev/')) { base = DEV; u = u.slice(4); }
  let p = path.join(base, u);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(base) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end('404 ' + u); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log('gamehub site/ on http://localhost:' + PORT));
