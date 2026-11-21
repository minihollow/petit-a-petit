// Petit à petit: progress sync server, for a Raspberry Pi at home (Node.js 18 or later, no dependency).
// It keeps the learner's events (append only) in DATA_DIR/events.jsonl and hands them to the other devices.
// Listen on 127.0.0.1 only and publish it on the tailnet with `tailscale serve` (HTTPS): see README.md.
//
// Environment:
//   SYNC_TOKEN       required, 24+ characters: the app sends it as "Authorization: Bearer <token>"
//   ALLOWED_ORIGINS  comma-separated web origins allowed to call (default https://minihollow.github.io)
//   STATUS_TOKEN     optional second token that may only read /status (Home Assistant)
//   PORT (8787), HOST (127.0.0.1), DATA_DIR (./data)
//
// API:
//   GET  /health                 -> { ok: true }                       (no token)
//   GET  /events?since=<cursor>  -> { events, cursor, more }
//   POST /events  { events: [] } -> { added, cursor }
//   GET  /status                 -> today's activity, for a reminder
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const TOKEN = process.env.SYNC_TOKEN || '';
const STATUS_TOKEN = process.env.STATUS_TOKEN || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://minihollow.github.io').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_BODY = 2 * 1024 * 1024;
const PAGE = 1000;

if (TOKEN.length < 24) {
  console.error('SYNC_TOKEN is missing or shorter than 24 characters (generate one with: openssl rand -hex 24)');
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, 'events.jsonl');
const events = [];
const ids = new Set();
if (fs.existsSync(FILE)) {
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (!ids.has(e.id)) { ids.add(e.id); events.push(e); } } catch { /* skip a damaged line */ }
  }
}
console.log(`${events.length} events loaded from ${FILE}`);

const same = (a, b) => { const A = Buffer.from(String(a)); const B = Buffer.from(String(b)); return A.length === B.length && crypto.timingSafeEqual(A, B); };
const bearer = (req) => /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1] || '';
const valid = (e) => e && typeof e === 'object' && typeof e.id === 'string' && e.id.length > 0 && e.id.length <= 64
  && Number.isFinite(e.ts) && typeof e.kind === 'string' && e.kind.length <= 24 && JSON.stringify(e).length <= 4000;

function cors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !ORIGINS.includes(origin)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  // Chrome's private / local network access preflight (a public site calling a tailnet address).
  if (req.headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
}
function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function status() {
  const today = dayKey(Date.now());
  const days = new Map();
  let last = 0;
  for (const e of events) {
    if (e.kind !== 'review') continue;
    const k = dayKey(e.ts);
    const d = days.get(k) || { ms: 0, items: 0 };
    d.ms += Math.min(Number(e.ms) || 0, 300000); d.items++;
    days.set(k, d);
    if (e.ts > last) last = e.ts;
  }
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const t = days.get(today) || { ms: 0, items: 0 };
  return { today, todayMinutes: Math.round(t.ms / 60000), todayItems: t.items, streak, lastActivity: last ? new Date(last).toISOString() : null, events: events.length };
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    const tok = bearer(req);
    const full = same(tok, TOKEN);
    if (url.pathname === '/status' && req.method === 'GET') {
      if (!full && !(STATUS_TOKEN && same(tok, STATUS_TOKEN))) return send(res, 401, { error: 'token' });
      return send(res, 200, status());
    }
    if (!full) return send(res, 401, { error: 'token' });
    if (url.pathname === '/events' && req.method === 'GET') {
      const since = Math.max(0, Math.min(events.length, parseInt(url.searchParams.get('since') || '0', 10) || 0));
      const page = events.slice(since, since + PAGE);
      return send(res, 200, { events: page, cursor: since + page.length, more: since + page.length < events.length });
    }
    if (url.pathname === '/events' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const fresh = (Array.isArray(body?.events) ? body.events : []).filter((e) => valid(e) && !ids.has(e.id));
      if (fresh.length) {
        fs.appendFileSync(FILE, fresh.map((e) => JSON.stringify(e)).join('\n') + '\n');
        for (const e of fresh) { ids.add(e.id); events.push(e); }
      }
      return send(res, 200, { added: fresh.length, cursor: events.length });
    }
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    return send(res, 400, { error: String(err.message || err) });
  }
});
server.listen(PORT, HOST, () => console.log(`Petit à petit sync on http://${HOST}:${PORT} (origins: ${ORIGINS.join(', ')})`));
