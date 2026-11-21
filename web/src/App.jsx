import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DATA from './data/verbs.json';
import { addEvent, allEvents, getKV, persist, setKV } from './lib/db.js';
import { buildCards } from './lib/srs.js';
import { curriculum, dayStats, dayKey, streak } from './lib/plan.js';
import { getSync, pairFromHash, syncNow } from './lib/sync.js';
import { refreshInstalled, setVoiceEngine, stopSpeaking } from './lib/tts.js';
import { doneLessons } from './lib/course.js';
import { AppCtx, migrate, DEFAULTS } from './store.js';
import { UI } from './i18n.js';
import { Bi, Icon, ModeFlag, MODES, scrollTop, tx } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Unit from './pages/Unit.jsx';
import Lesson from './pages/Lesson.jsx';
import Review from './pages/Review.jsx';
import Library from './pages/Library.jsx';
import Progress from './pages/Progress.jsx';
import Verbs from './pages/Verbs.jsx';
import Verb from './pages/Verb.jsx';
import Session from './pages/Session.jsx';
import Settings from './pages/Settings.jsx';
import Mots from './pages/Mots.jsx';
import Theme from './pages/Theme.jsx';
import GenderRules from './pages/GenderRules.jsx';
import Grammar from './pages/Grammar.jsx';
import Chapter from './pages/Chapter.jsx';
import Sounds from './pages/Sounds.jsx';
import SyncLine from './components/SyncLine.jsx';
import { wordCourse } from './lib/vocab.js';
import { getStatus, hasModel, MODELS, recommendedModel } from './lib/coco.js';
import CocoPanel, { CocoAvatar } from './components/Coco.jsx';

const VERBS = DATA.verbs;
const BY_INF = new Map(VERBS.map((v) => [v.inf, v]));
const lookup = (inf) => BY_INF.get(inf);
const WORD_COURSE = wordCourse();

// Side menu on a computer, bottom bar on a phone (Settings moves to the top bar there).
const NAV = [
  { id: 'home', icon: 'route', k: 'nav_path' },
  { id: 'review', icon: 'cards', k: 'nav_review' },
  { id: 'library', icon: 'library', k: 'nav_library' },
  { id: 'progress', icon: 'chart', k: 'nav_progress' },
  { id: 'settings', icon: 'gear', k: 'nav_settings' },
];
const NAV_OF = { unit: 'home', lesson: 'home', session: 'library', verbs: 'library', verb: 'library', words: 'library', theme: 'library', rules: 'library', grammar: 'library', chapter: 'library', sounds: 'library' };

export default function App() {
  const [events, setEvents] = useState(null);
  const [settings, setSettings] = useState(DEFAULTS);
  const [route, setRoute] = useState({ name: 'home', params: {} });
  const [sync, setSyncState] = useState({ status: 'off' });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [cocoStatus, setCocoStatus] = useState({ running: false, models: [] });
  const [cocoOpen, setCocoOpen] = useState(null); // { ctx, ask, key }

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
      setSettings(migrate(await getKV('settings', {})));
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

  const addLocal = (ev) => setEvents((prev) => [...(prev || []), { ...ev, synced: 0 }]);
  const record = useCallback(async (card, res) => {
    addLocal(await addEvent({ kind: 'review', card, rating: res.rating, ok: res.ok, near: res.near, n: res.n, ms: res.ms }));
  }, []);
  // A finished game counts in today's minutes (no card is scheduled).
  const logGame = useCallback(async ({ game, ok, n, ms }) => {
    addLocal(await addEvent({ kind: 'game', game, ok, n, ms }));
  }, []);
  // A finished lesson of the course (its cards were recorded on the way; ms only for listening and writing).
  const logLesson = useCallback(async (lesson, { ok = 0, n = 0, ms = 0, text = '' } = {}) => {
    addLocal(await addEvent({ kind: 'lesson', lesson, ok, n, ms, ...(text ? { text: text.slice(0, 1500) } : {}) }));
    doSync();
  }, [doSync]);

  // Navigation, with the phone's back button.
  const go = useCallback((name, params = {}) => {
    stopSpeaking();
    setRoute({ name, params });
    history.pushState({ name, params }, '');
    scrollTop();
  }, []);
  const back = useCallback(() => { if (history.state?.name && history.length > 1) history.back(); else go('home'); }, [go]);
  useEffect(() => {
    history.replaceState({ name: 'home', params: {} }, '');
    const onPop = (e) => { stopSpeaking(); setRoute(e.state?.name ? e.state : { name: 'home', params: {} }); scrollTop(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Coco: only when turned on in Settings (this computer runs Ollama). Checked at start and every minute.
  const refreshCoco = useCallback(async () => { const s = await getStatus(); setCocoStatus(s); return s; }, []);
  useEffect(() => {
    if (settings.coco !== 'on') { setCocoStatus({ running: false, models: [] }); return undefined; }
    refreshCoco();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshCoco(); }, 60000);
    return () => clearInterval(t);
  }, [settings.coco, refreshCoco]);
  const coco = useMemo(() => {
    const st = cocoStatus;
    const model = hasModel(st, settings.cocoModel) ? settings.cocoModel
      : [recommendedModel(), ...MODELS.map((m) => m.name)].find((m) => hasModel(st, m)) || st.models?.[0]?.name || '';
    return { on: settings.coco === 'on', status: st, model, ready: settings.coco === 'on' && st.running && !!model };
  }, [cocoStatus, settings.coco, settings.cocoModel]);
  const openCoco = useCallback(({ ctx = null, ask = null } = {}) => setCocoOpen({ ctx, ask, key: Date.now() }), []);

  const course = useMemo(() => curriculum(VERBS), []);
  const cards = useMemo(() => (events ? buildCards(events) : new Map()), [events]);
  const days = useMemo(() => (events ? dayStats(events) : {}), [events]);
  const done = useMemo(() => doneLessons(events), [events]);

  const store = useMemo(() => ({
    verbs: VERBS, byInf: BY_INF, lookup, events, cards, days, done, course, wordCourse: WORD_COURSE, settings, update, record, logGame, logLesson,
    go, back, notify, reload, sync, doSync, coco, openCoco, refreshCoco,
  }), [events, cards, days, done, course, settings, update, record, logGame, logLesson, go, back, notify, reload, sync, doSync, coco, openCoco, refreshCoco]);

  if (!events) return <div className="splash" aria-busy="true"><span className="brand-mark">Petit <i>à</i> petit</span></div>;

  const endSession = (did) => { if (did) doSync(); back(); };
  let page;
  switch (route.name) {
    case 'unit': page = <Unit key={route.params.id} id={route.params.id} />; break;
    case 'lesson': page = <Lesson key={`${route.params.id}-${route.params.k || 0}`} id={route.params.id} />; break;
    case 'review': page = <Review key={route.params.k || 0} />; break;
    case 'library': page = <Library />; break;
    case 'progress': page = <Progress />; break;
    case 'verbs': page = <Verbs />; break;
    case 'verb': page = <Verb key={route.params.inf} inf={route.params.inf} />; break;
    case 'session': page = <Session key={route.params.items.join('|')} items={route.params.items} onEnd={endSession} />; break;
    case 'settings': page = <Settings />; break;
    case 'words': page = <Mots />; break;
    case 'theme': page = <Theme key={route.params.id} id={route.params.id} />; break;
    case 'rules': page = <GenderRules />; break;
    case 'grammar': page = <Grammar />; break;
    case 'sounds': page = <Sounds />; break;
    case 'chapter': page = <Chapter key={route.params.id} id={route.params.id} />; break;
    default: page = <Home />;
  }
  const active = NAV_OF[route.name] || route.name;
  const st = streak(days);
  const minutes = Math.round((days[dayKey(Date.now())]?.ms || 0) / 60000);
  const mode = MODES.includes(settings.mode) ? settings.mode : 'bi';

  return (
    <AppCtx.Provider value={store}>
      <div className="app" lang={mode === 'tr' ? 'tr' : 'fr'}>
        <nav className="side" aria-label="Menu">
          <button type="button" className="brand" onClick={() => go('home')}>
            <span className="brand-logo" aria-hidden="true">à</span>
            <span className="brand-name">Petit à petit<small><Bi k="app_sub" /></small></span>
          </button>
          {NAV.map((n) => (
            <button key={n.id} type="button" className={`nav-btn nav-${n.id}`} aria-current={active === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <span className="ico"><Icon name={n.icon} size={20} /></span>
              <span className="nav-label"><Bi k={n.k} dual /></span>
              <span className="nav-short"><Bi k={n.k} /></span>
            </button>
          ))}
          <div className="side-foot"><SyncLine /></div>
        </nav>

        <div className="main">
          <header className="topbar">
            <div className="modes" role="group" aria-label={UI.mode_label[mode === 'tr' ? 1 : 0]}>
              {MODES.map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} title={UI[`mode_${m}_desc`][mode === 'tr' ? 1 : 0]} onClick={() => update({ mode: m })}>
                  <ModeFlag mode={m} /><span>{UI[`mode_${m}`][mode === 'tr' ? 1 : 0]}</span>
                </button>
              ))}
            </div>
            <div className="spacer" />
            <span className="pill sun" title={tx('streak')[mode === 'tr' ? 1 : 0]}><Icon name="flame" size={16} />{st}</span>
            <span className="pill" title={tx('minutes_today')[mode === 'tr' ? 1 : 0]}>{minutes}/{settings.goal} min</span>
            {coco.ready && (
              <button type="button" className="btn small ink coco-open" onClick={() => openCoco()}><CocoAvatar size={22} /> Coco</button>
            )}
            <button type="button" className="icon-btn top-settings" aria-label={UI.nav_settings[0]} aria-current={active === 'settings' ? 'page' : undefined}
              onClick={() => go('settings')}><Icon name="gear" size={20} /></button>
          </header>
          <main className="content">{page}</main>
        </div>

        {cocoOpen && coco.ready && <CocoPanel key={cocoOpen.key} ctx={cocoOpen.ctx} ask={cocoOpen.ask} onClose={() => setCocoOpen(null)} />}
        {toast && <div className="toast" role="status"><Bi pair={toast} /></div>}
      </div>
    </AppCtx.Provider>
  );
}
