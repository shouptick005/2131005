#!/usr/bin/env node
/* Local preview server that mimics Vercel's cleanUrls. Usage: node scripts/serve.js [port] */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const base = path.join(ROOT, clean);
  if (!base.startsWith(ROOT)) return null;
  const candidates = [base, `${base}.html`, path.join(base, 'index.html')];
  return candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // Like Vercel: /page.html -> /page, /dir/ -> /dir
  if (/\.html$/.test(url.pathname) || (url.pathname.length > 1 && url.pathname.endsWith('/'))) {
    const target = url.pathname.replace(/(index)?\.html$/, '').replace(/\/+$/, '') || '/';
    res.writeHead(308, { Location: target + url.search });
    return res.end();
  }
  let file;
  try {
    file = resolve(url.pathname);
  } catch (e) {
    // e.g. "/%": decodeURIComponent throws on malformed escapes; don't take the server down.
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request');
  }
  let status = 200;
  if (!file) {
    file = path.join(ROOT, '404.html');
    status = 404;
  }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
