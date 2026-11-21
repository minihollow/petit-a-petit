import { useApp } from '../store.js';
import { Bi } from './ui.jsx';

const KEY = { ok: 'sync_ok', unreachable: 'sync_unreachable', token: 'sync_token_bad', http: 'sync_http' };
const ago = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 1 ? ["à l'instant", 'az önce'] : m < 60 ? [`il y a ${m} min`, `${m} dk önce`] : [`il y a ${Math.round(m / 60)} h`, `${Math.round(m / 60)} sa önce`];
};

// One line about syncing with the home server (nothing when the device is not paired).
export default function SyncLine() {
  const { sync, doSync } = useApp();
  if (sync.status === 'off') return null;
  return (
    <button type="button" className={`syncline s-${sync.status}`} onClick={() => doSync(true)}>
      <span className="dot" />
      {sync.status === 'running' ? <span>…</span> : <Bi k={KEY[sync.status] || 'sync_http'} inline />}
      {sync.status === 'ok' && sync.at && <span className="muted"> · <Bi pair={ago(sync.at)} inline /></span>}
    </button>
  );
}
