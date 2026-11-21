// Storage on the device (IndexedDB).
// - events: what the learner did, append only ({ id, ts, dev, kind, ... }). Progress is computed from
//   them, so two devices merge by simply taking the union of their events (see sync.js).
// - kv: settings and small values ({ k, v }).
import Dexie from 'dexie';

export const db = new Dexie('petit-a-petit');
db.version(1).stores({ events: 'id, ts, synced', kv: 'k' });

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

export async function getKV(k, def = null) {
  const r = await db.kv.get(k);
  return r === undefined ? def : r.v;
}
export async function setKV(k, v) { await db.kv.put({ k, v }); }

let device = null;
export async function deviceId() {
  if (device) return device;
  device = await getKV('device');
  if (!device) { device = uid(); await setKV('device', device); }
  return device;
}

export async function addEvent(e) {
  const ev = { id: uid(), ts: Date.now(), dev: await deviceId(), ...e };
  await db.events.put({ ...ev, synced: 0 });
  return ev;
}
export const allEvents = () => db.events.orderBy('ts').toArray();

// Ask the browser not to evict progress when the device runs out of space.
export function persist() { try { navigator.storage?.persist?.(); } catch { /* ignore */ } }

// Backup file: { kind, version, exported, settings, events }.
export async function exportAll() {
  const [events, kv] = await Promise.all([allEvents(), db.kv.toArray()]);
  const settings = Object.fromEntries(kv.filter((r) => !['device', 'syncCursor', 'sync'].includes(r.k)).map((r) => [r.k, r.v]));
  return { kind: 'petit-a-petit', version: 1, exported: new Date().toISOString(), settings, events: events.map(({ synced, ...e }) => e) };
}
export async function importAll(data) {
  if (data?.kind !== 'petit-a-petit' || !Array.isArray(data.events)) throw new Error('bad file');
  const known = new Set(await db.events.toCollection().primaryKeys());
  const fresh = data.events.filter((e) => e && typeof e.id === 'string' && typeof e.ts === 'number' && !known.has(e.id));
  await db.events.bulkPut(fresh.map((e) => ({ ...e, synced: 0 })));
  for (const [k, v] of Object.entries(data.settings || {})) await setKV(k, v);
  return fresh.length;
}
