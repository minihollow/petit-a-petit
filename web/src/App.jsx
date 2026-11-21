import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DATA from './data/verbs.json';
import { addEvent, allEvents, getKV, persist, setKV } from './lib/db.js';
import { buildCards } from './lib/srs.js';
import { curriculum, dayStats, dayKey, streak } from './lib/plan.js';
import { getSync, pairFromHash, syncNow } from './lib/sync.js';
import { refreshInstalled, setVoiceEngine, stopSpeaking } from './lib/tts.js';
import { AppCtx, DEFAULTS } from './store.js';
import { Bi, Icon, tx } from './components/ui.jsx';
import Today from './pages/Today.jsx';
import Verbs from './pages/Verbs.jsx';
import Verb from './pages/Verb.jsx';
import Session from './pages/Session.jsx';
import Settings from './pages/Settings.jsx';

const VERBS = DATA.verbs;
const BY_INF = new Map(VERBS.map((v) => [v.inf, v]));
const lookup = (inf) => BY_INF.get(inf);
const NAV = [['today', 'home', 'nav_today'], ['verbs', 'list', 'nav_verbs'], ['settings', 'gear', 'nav_settings']];

export default function App() {
  const [events, setEvents] = useState(null);
  const [settings, setSettings] = useState(DEFAULTS);
  const [route, setRoute] = useState({ name: 'today', params: {} });
  const [sync, setSyncState] = useState({ status: 'off' });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((pair) => {
    setToast(pair);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const reload = useCallback(async () => setEvents(await allEvents()), []);

  const doSync = useCallback(async (manual = false) => {
    if (!(await getSync())) { setSyncState({ status: 'off' }); return; }
    setSyncState((s) => ({ ...s, status: 'running' }));
    try {
      const r = await syncNow();
      setSyncState({ status: 'ok', at: Date.now() });
      if (r.pulled) await reload();
      if (manual) notify(tx('sync_ok'));
    } catch (e) {
      setSyncState({ status: e.code === 'off' ? 'off' : e.code || 'unreachable', at: Date.now() });
    }
  }, [notify, reload]);

  // Start: settings, pairing link, progress, then a first sync.
  useEffect(() => {
    (async () => {
      persist();
      const paired = await pairFromHash();
      setSettings({ ...DEFAULTS, ...(await getKV('settings', {})) });
      await reload();
      if (paired) notify(tx('sync_paired'));
      refreshInstalled();
      doSync();
    })();
  }, [doSync, notify, reload]);

  // Sync again when the app comes back to the screen, and every 5 minutes while it is open.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') doSync(); };
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => { if (document.visibilityState === 'visible') doSync(); }, 5 * 60000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [doSync]);

  const update = useCallback((patch) => {
    setSettings((s) => { const n = { ...s, ...patch }; setKV('settings', n); return n; });
  }, []);

  useEffect(() => { setVoiceEngine(settings.voice); }, [settings.voice]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = settings.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : settings.theme; };
    apply();
    try { localStorage.setItem('pap-theme', settings.theme); } catch { /* ignore */ }
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

  const record = useCallback(async (card, res) => {
    const ev = await addEvent({ kind: 'review', card, rating: res.rating, ok: res.ok, near: res.near, n: res.n, ms: res.ms });
    setEvents((prev) => [...(prev || []), { ...ev, synced: 0 }]);
  }, []);

  // Navigation, with the phone's back button.
  const go = useCallback((name, params = {}) => {
    stopSpeaking();
    setRoute({ name, params });
    history.pushState({ name, params }, '');
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    history.replaceState({ name: 'today', params: {} }, '');
    const onPop = (e) => { stopSpeaking(); setRoute(e.state?.name ? e.state : { name: 'today', params: {} }); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const course = useMemo(() => curriculum(VERBS), []);
  const cards = useMemo(() => (events ? buildCards(events) : new Map()), [events]);
  const days = useMemo(() => (events ? dayStats(events) : {}), [events]);

  const store = useMemo(() => ({
    verbs: VERBS, byInf: BY_INF, lookup, events, cards, days, course, settings, update, record, go, notify, reload, sync, doSync,
  }), [events, cards, days, course, settings, update, record, go, notify, reload, sync, doSync]);

  if (!events) return <div className="splash" aria-busy="true"><span className="brand-mark">Petit <i>à</i> petit</span></div>;

  const endSession = (did) => { if (did) doSync(); go('today'); };
  let page;
  switch (route.name) {
    case 'verbs': page = <Verbs />; break;
    case 'verb': page = <Verb key={route.params.inf} inf={route.params.inf} />; break;
    case 'session': page = <Session key={route.params.items.join('|')} items={route.params.items} onEnd={endSession} />; break;
    case 'settings': page = <Settings />; break;
    default: page = <Today />;
  }
  const active = route.name === 'verb' ? 'verbs' : route.name;
  const st = streak(days);
  const minutes = Math.round((days[dayKey(Date.now())]?.ms || 0) / 60000);

  return (
    <AppCtx.Provider value={store}>
      <div className={`app${route.name === 'session' ? ' in-session' : ''}`} lang="fr">
        <header className="top">
          <button type="button" className="brand-mark" onClick={() => go('today')}>Petit <i>à</i> petit</button>
          <span className="top-stats" title="minutes · jours">
            <span>{minutes}/{settings.goal} min</span>
            <span className="streak"><Icon name="flame" size={16} />{st}</span>
          </span>
        </header>
        <nav className="tabs" aria-label="Menu">
          {NAV.map(([id, icon, k]) => (
            <button key={id} type="button" className="tab" aria-current={active === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon name={icon} /><span className="tab-l"><Bi k={k} /></span>
            </button>
          ))}
        </nav>
        <main className="content">{page}</main>
        {toast && <div className="toast" role="status"><Bi pair={toast} /></div>}
      </div>
    </AppCtx.Provider>
  );
}
