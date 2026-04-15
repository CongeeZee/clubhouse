#!/usr/bin/env node
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT  = 3000;
const ROOT  = __dirname;
const VAULT = '/home/fool/projects/claude-vault';

const MIME = {
  '.html':        'text/html; charset=utf-8',
  '.js':          'text/javascript',
  '.css':         'text/css',
  '.json':        'application/json',
  '.png':         'image/png',
  '.ico':         'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
function json(res, data)        { send(res, 200, 'application/json', JSON.stringify(data)); }
function fail(res, msg, code=400){ send(res, code, 'application/json', JSON.stringify({ error: msg })); }

function isAllowed(p) {
  const resolved = path.resolve(p);
  return resolved === VAULT || resolved.startsWith(VAULT + path.sep);
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { send(res, 204, 'text/plain', ''); return; }

  const { pathname, query } = url.parse(req.url, true);

  // ── Files API ──────────────────────────────────────────────────────────────
  if (pathname === '/api/files') {
    return json(res, { roots: [{ name: 'claude-vault', path: VAULT }] });
  }

  if (pathname === '/api/files/browse') {
    const p = query.path;
    if (!p || !isAllowed(p)) return fail(res, 'Path not allowed');
    try {
      const entries = fs.readdirSync(p)
        .filter(n => !n.startsWith('.'))
        .map(name => {
          const full = path.join(p, name);
          const stat  = fs.statSync(full);
          return { name, path: full, isDir: stat.isDirectory() };
        });
      return json(res, { path: p, entries });
    } catch (e) { return fail(res, e.message); }
  }

  if (pathname === '/api/files/read') {
    const p = query.path;
    if (!p || !isAllowed(p)) return fail(res, 'Path not allowed');
    try {
      return json(res, { content: fs.readFileSync(p, 'utf8') });
    } catch (e) { return fail(res, e.message); }
  }

  // ── Static files ───────────────────────────────────────────────────────────
  const file     = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(ROOT, file);

  if (!filePath.startsWith(ROOT)) return fail(res, 'Forbidden', 403);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 200, 'text/html; charset=utf-8',
      fs.readFileSync(path.join(ROOT, 'index.html')));
  }

  const mime = MIME[path.extname(filePath)] || 'text/plain';
  send(res, 200, mime, fs.readFileSync(filePath));

}).listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ⚡ CLUBHOUSE  →  http://localhost:${PORT}\n`);
});
