// Self-test of sync-server.mjs: starts it on a free port with a temporary data folder, runs requests, stops it.
// Usage: node test-server.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'pap-sync-'));
const PORT = 18000 + Math.floor(Math.random() * 1000);
const TOKEN = 'testtoken_testtoken_1234';
const STATUS = 'status_status_status_1234';
const child = spawn(process.execPath, [join(here, 'sync-server.mjs')], {
  env: { ...process.env, SYNC_TOKEN: TOKEN, STATUS_TOKEN: STATUS, PORT: String(PORT), DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'],
});
const base = `http://127.0.0.1:${PORT}`;
const auth = (t = TOKEN) => ({ Authorization: `Bearer ${t}` });
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => null), headers: r.headers });

try {
  for (let i = 0; i < 50; i++) { try { await fetch(`${base}/health`); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  assert.deepEqual((await json(await fetch(`${base}/health`))).body, { ok: true });
  assert.equal((await fetch(`${base}/events`)).status, 401);
  const now = Date.now();
  const evs = [
    { id: 'a1', ts: now, kind: 'review', card: 'conj:parler:ind:pre', rating: 3, ok: 6, n: 6, ms: 42000 },
    { id: 'a2', ts: now, kind: 'review', card: 'conj:être:ind:pre', rating: 2, ok: 4, n: 6, ms: 61000 },
    { bad: 1 },
  ];
  let r = await json(await fetch(`${base}/events`, { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ events: evs }) }));
  assert.deepEqual(r.body, { added: 2, cursor: 2 });
  r = await json(await fetch(`${base}/events`, { method: 'POST', headers: auth(), body: JSON.stringify({ events: [evs[0]] }) }));
  assert.deepEqual(r.body, { added: 0, cursor: 2 }, 'duplicate ignored');
  r = await json(await fetch(`${base}/events?since=1`, { headers: auth() }));
  assert.equal(r.body.events.length, 1); assert.equal(r.body.events[0].id, 'a2'); assert.equal(r.body.more, false); assert.equal(r.body.cursor, 2);
  r = await json(await fetch(`${base}/status`, { headers: auth(STATUS) }));
  assert.equal(r.body.todayItems, 2); assert.equal(r.body.todayMinutes, 2); assert.equal(r.body.streak, 1);
  assert.equal((await fetch(`${base}/events`, { headers: auth(STATUS) })).status, 401, 'status token cannot read events');
  r = await fetch(`${base}/events`, { method: 'OPTIONS', headers: { Origin: 'https://minihollow.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://minihollow.github.io');
  assert.equal(r.headers.get('access-control-allow-private-network'), 'true');
  r = await fetch(`${base}/events`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(r.headers.get('access-control-allow-origin'), null, 'other origins refused');
  assert.equal(readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').length, 2);
  console.log('sync-server: all checks passed');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  child.kill();
  setTimeout(() => rmSync(dir, { recursive: true, force: true }), 300);
}
