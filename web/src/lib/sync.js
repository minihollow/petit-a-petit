// Sync with the home server (server/sync-server.mjs on the Raspberry Pi, reached through Tailscale).
// Events go up, the other devices' events come down; nothing is ever overwritten.
// Pairing: open the app once with #pair=<base64url of {"u": server URL, "t": token}>, or fill Settings.
import { db, getKV, setKV } from './db.js';

export const getSync = () => getKV('sync', null); // { url, token }
export async function setSync(cfg) {
  await setKV('sync', cfg && cfg.url ? { url: cfg.url.replace(/\/+$/, ''), token: cfg.token.trim() } : null);
  await setKV('syncCursor', 0);
}

// Reads #pair=… from the address, stores it, and removes it from the address.
export async function pairFromHash() {
  const m = /[#&]pair=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return false;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const json = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    const { u, t } = JSON.parse(json);
    if (!/^https:\/\//.test(u) || !t) return false;
    await setSync({ url: u, token: t });
    return true;
  } catch { return false; }
}

async function call(cfg, path, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(cfg.url + path, { ...opts, signal: ctrl.signal, headers: { ...(opts.headers || {}), Authorization: `Bearer ${cfg.token}` } });
    if (r.status === 401) throw Object.assign(new Error('token'), { code: 'token' });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { code: 'http' });
    return r.json();
  } catch (e) {
    if (e.code) throw e;
    throw Object.assign(new Error('unreachable'), { code: 'unreachable' });
  } finally { clearTimeout(timer); }
}

export async function testSync(cfg) { return call(cfg, '/status'); }

let running = null;
// Returns { pushed, pulled }; throws { code: 'token' | 'unreachable' | 'http' | 'off' }.
export function syncNow() {
  if (running) return running;
  running = (async () => {
    const cfg = await getSync();
    if (!cfg) throw Object.assign(new Error('off'), { code: 'off' });
    const unsynced = await db.events.where('synced').equals(0).toArray();
    for (let i = 0; i < unsynced.length; i += 500) {
      const batch = unsynced.slice(i, i + 500);
      await call(cfg, '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: batch.map(({ synced, ...e }) => e) }) });
      await db.events.bulkPut(batch.map((e) => ({ ...e, synced: 1 })));
    }
    let cursor = await getKV('syncCursor', 0);
    let pulled = 0;
    for (let guard = 0; guard < 200; guard++) {
      const res = await call(cfg, `/events?since=${cursor}`);
      const ids = res.events.map((e) => e.id);
      const have = new Set((await db.events.bulkGet(ids)).filter(Boolean).map((e) => e.id));
      const fresh = res.events.filter((e) => !have.has(e.id));
      if (fresh.length) await db.events.bulkPut(fresh.map((e) => ({ ...e, synced: 1 })));
      pulled += fresh.length;
      cursor = res.cursor;
      if (!res.more) break;
    }
    await setKV('syncCursor', cursor);
    await setKV('lastSync', Date.now());
    return { pushed: unsynced.length, pulled };
  })().finally(() => { running = null; });
  return running;
}
