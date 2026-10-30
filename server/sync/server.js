// Сервер синхронизации учёта колориста. Один файл, без зависимостей. Node 18+.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 8787;
const KEY = process.env.KEY || '';
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DIR, { recursive: true });
const FILE = path.join(DIR, 'data.json');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Key');
}

function dailyBackup() {
  try {
    if (!fs.existsSync(FILE)) return;
    const day = new Date().toISOString().slice(0, 10);
    const b = path.join(DIR, 'backup-' + day + '.json');
    if (!fs.existsSync(b)) fs.copyFileSync(FILE, b);
    const list = fs.readdirSync(DIR).filter(f => f.startsWith('backup-')).sort();
    while (list.length > 30) fs.unlinkSync(path.join(DIR, list.shift()));
  } catch (e) {}
}

http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const u = new URL(req.url, 'http://x');

  if (u.pathname === '/health') { res.writeHead(200); return res.end('ok'); }
  if (u.pathname !== '/data') { res.writeHead(404); return res.end(); }
  if (KEY && req.headers['x-key'] !== KEY) { res.writeHead(401); return res.end('bad key'); }

  if (req.method === 'GET') {
    if (!fs.existsSync(FILE)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return fs.createReadStream(FILE).pipe(res);
  }

  if (req.method === 'PUT') {
    let body = '', size = 0;
    req.on('data', ch => { size += ch.length; if (size > 10e6) req.destroy(); else body += ch; });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        if (!j || typeof j.updatedAt === 'undefined' || !j.db) throw new Error('bad');
        dailyBackup();
        fs.writeFileSync(FILE + '.tmp', JSON.stringify(j));
        fs.renameSync(FILE + '.tmp', FILE);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }

  res.writeHead(405); res.end();
}).listen(PORT, () => console.log('sync server on :' + PORT));
