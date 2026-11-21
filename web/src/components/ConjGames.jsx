import { useEffect, useMemo, useRef, useState } from 'react';
import { grade, tableRows, TENSES } from '../lib/conj.js';
import { parseCard } from '../lib/plan.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { AccentBar, Bi, Parts } from './ui.jsx';

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Tables already started, or the most common verbs in the present at the start.
function usePool() {
  const { cards, byInf, lookup } = useApp();
  return useMemo(() => {
    let ids = [...cards.keys()].filter((id) => id.startsWith('conj:'));
    if (ids.length < 3) ids = ['être', 'avoir', 'aller', 'faire', 'parler', 'aimer', 'venir', 'prendre', 'pouvoir', 'vouloir'].map((v) => `conj:${v}:ind:pre`);
    return ids.map((id) => { const p = parseCard(id); const v = p && byInf.get(p.inf); return v ? { v, tense: p.tense, rows: tableRows(v, p.tense, lookup) } : null; })
      .filter((x) => x && x.rows.length);
  }, [cards, byInf, lookup]);
}
function useGameLog(name) {
  const { logGame } = useApp();
  const start = useRef(Date.now());
  return (ok, n) => { logGame({ game: name, ok, n, ms: Date.now() - start.current }); start.current = Date.now(); };
}

// Sprint: as many forms as possible in 60 seconds.
export function Sprint({ seconds = 60 }) {
  const { settings } = useApp();
  const pool = usePool();
  const [state, setState] = useState('ready'); // ready | run | end
  const [left, setLeft] = useState(seconds);
  const [q, setQ] = useState(null);
  const [val, setVal] = useState('');
  const [flash, setFlash] = useState(null);
  const [score, setScore] = useState({ ok: 0, n: 0, miss: [] });
  const field = useRef(null);
  const log = useGameLog('sprint');
  const next = () => { const t = pick(pool); setQ({ ...t, row: pick(t.rows) }); setVal(''); };
  useEffect(() => {
    if (state !== 'run') return undefined;
    const timer = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(timer); setState('end'); return 0; } return s - 1; }), 1000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => { if (state === 'end') log(score.ok, score.n); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state === 'run') field.current?.focus({ preventScroll: true }); }, [state, q]);
  const start = () => { setScore({ ok: 0, n: 0, miss: [] }); setLeft(seconds); next(); setState('run'); };
  const submit = () => {
    if (!q || !val.trim()) return;
    const g = grade(val, q.row);
    const right = g.k === 'ok';
    setScore((s) => ({ ok: s.ok + (right ? 1 : 0), n: s.n + 1, miss: right ? s.miss : [...s.miss, { q, typed: val }] }));
    setFlash(right ? 'ok' : 'bad');
    setTimeout(() => setFlash(null), 350);
    if (!right) speak(q.row.say, { rate: settings.rate });
    next();
  };
  if (state === 'ready') {
    return <div className="game"><p className="small"><Bi k="sprint_desc" /></p><button type="button" className="btn primary" onClick={start}><Bi k="sprint_start" inline /></button></div>;
  }
  if (state === 'end') {
    return (
      <div className="game">
        <p className="big-num">{score.ok}</p>
        <p><Bi k="score" inline /> · {score.n} <Bi k="sprint_tries" inline /></p>
        {score.miss.length > 0 && (
          <ul className="miss">{score.miss.slice(0, 8).map((m, k) => (
            <li key={k}><span className="muted" lang="fr">{m.q.row.label}</span> <s>{m.typed}</s> → <Parts parts={m.q.row.parts} /> <span className="muted small">({m.q.v.inf}, {TENSES[m.q.tense].fr})</span></li>
          ))}</ul>
        )}
        <button type="button" className="btn primary" onClick={start}><Bi k="play_again" inline /></button>
      </div>
    );
  }
  return (
    <div className={`game sprint${flash ? ` f-${flash}` : ''}`}>
      <div className="game-top"><span className="timer">{left} s</span><span>{score.ok} ✓</span></div>
      <p className="sprint-q"><b lang="fr">{q.v.inf}</b> · <span lang="fr">{TENSES[q.tense].fr}</span></p>
      <AccentBar />
      <div className="drow">
        <label className="lbl" htmlFor="sprint-f" lang="fr">{q.row.label}</label>
        <input id="sprint-f" ref={field} data-fr="" lang="fr" className="field" value={val} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          enterKeyHint="next" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
      </div>
      <button type="button" className="btn primary" onClick={submit}><Bi k="check" inline /></button>
    </div>
  );
}

// Quel temps ? A conjugated form is shown and read: find its tense.
export function WhichTense({ rounds = 10 }) {
  const { settings } = useApp();
  const pool = usePool();
  const [seed, setSeed] = useState(0);
  const tenses = useMemo(() => [...new Set(pool.map((p) => p.tense))], [pool]);
  const list = useMemo(() => Array.from({ length: rounds }, () => { const t = pick(pool); return { ...t, row: pick(t.rows) }; }), [pool, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState(null);
  const [ok, setOk] = useState(0);
  const log = useGameLog('which-tense');
  const cur = list[i];
  const options = useMemo(() => {
    if (!cur) return [];
    const others = shuffle(Object.keys(TENSES).filter((t) => t !== cur.tense && (tenses.includes(t) || tenses.length < 3))).slice(0, 2);
    return shuffle([cur.tense, ...others]);
  }, [cur, tenses]);
  useEffect(() => { if (cur) speak(cur.row.say, { rate: settings.rate }); }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) return <div className="game-end"><p className="big-num">{ok} / {list.length}</p><button type="button" className="btn primary" onClick={() => { setSeed((s) => s + 1); setI(0); setOk(0); setChoice(null); }}><Bi k="play_again" inline /></button></div>;
  return (
    <div className="game">
      <div className="game-top"><span>{i + 1} / {list.length}</span><span>{ok} ✓</span></div>
      <p className="sprint-q" lang="fr"><span className="muted">{cur.row.label}</span> <Parts parts={cur.row.parts} /></p>
      <div className="options">
        {options.map((t) => (
          <button key={t} type="button" disabled={!!choice} className={`opt${choice && t === cur.tense ? ' good' : ''}${choice === t && t !== cur.tense ? ' bad' : ''}`}
            onClick={() => { setChoice(t); if (t === cur.tense) setOk((n) => n + 1); }}>
            <span lang="fr">{TENSES[t].fr}</span>{settings.mode === 'tr' && <span className="tr-i" lang="tr">{TENSES[t].tr}</span>}
          </button>
        ))}
      </div>
      {choice && (
        <div className="game-fb">
          <p className="small"><b lang="fr">{cur.v.inf}</b> · <span lang="tr">{cur.v.tr}</span></p>
          <button type="button" className="btn primary" onClick={() => { if (i + 1 >= list.length) log(ok, list.length); setChoice(null); setI(i + 1); }}><Bi k="next" inline /></button>
        </div>
      )}
    </div>
  );
}
