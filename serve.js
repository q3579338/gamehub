// 本地预览 site/（纯静态，不缓存）。用法：node serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, 'site');
const PORT = Number(process.argv[2] || 8795);
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let p = path.join(ROOT, u);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end('404 ' + u); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log('gamehub site/ on http://localhost:' + PORT));
