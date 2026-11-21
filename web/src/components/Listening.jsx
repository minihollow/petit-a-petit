import { useEffect, useMemo, useRef, useState } from 'react';
import SOUNDS from '../data/sounds.json';
import { CHAPTERS, filled } from '../lib/grammar.js';
import { lookupWord, tokenize } from '../lib/lexicon.js';
import { norm, strip } from '../lib/conj.js';
import { toTK } from '../lib/phon.js';
import { gradeWord, label, WORDS, isNoun } from '../lib/vocab.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { AccentBar, Bi } from './ui.jsx';
import Words from './Words.jsx';
import { WordLabel } from './WordCard.jsx';

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function useGameLog(name) {
  const { logGame } = useApp();
  const start = useRef(Date.now());
  return (ok, n) => { logGame({ game: name, ok, n, ms: Date.now() - start.current }); start.current = Date.now(); };
}

// Écoute fine: one word of a minimal pair is read, find which one.
export function PairsGame({ rounds = 10 }) {
  const { settings } = useApp();
  const [set, setSet] = useState(0);
  const group = SOUNDS.pairs[set];
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => shuffle(Array.from({ length: rounds }, () => {
    const items = group.items[Math.floor(Math.random() * group.items.length)];
    return { items, said: items[Math.floor(Math.random() * items.length)] };
  })), [group, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [ok, setOk] = useState(0);
  const log = useGameLog('pairs');
  const cur = list[i];
  useEffect(() => { if (cur) speak(cur.said, { rate: settings.rate * 0.9 }); }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps
  const restart = (s = set) => { setSet(s); setSeed((x) => x + 1); setI(0); setOk(0); setPick(null); };
  return (
    <div className="game">
      <div className="seg pairs-seg" role="group" aria-label="Sons / Sesler">
        {SOUNDS.pairs.map((p, k) => <button key={p.fr} type="button" aria-pressed={k === set} onClick={() => restart(k)}>{p.fr}</button>)}
      </div>
      <p className="small muted" lang="tr">{group.tr}</p>
      {i >= list.length ? (
        <div className="game-end"><p className="big-num">{ok} / {list.length}</p><button type="button" className="btn primary" onClick={() => restart()}><Bi k="play_again" inline /></button></div>
      ) : (
        <>
          <div className="game-top"><span>{i + 1} / {list.length}</span><span>{ok} ✓</span></div>
          <div className="game-word"><button type="button" className="btn ghost" onClick={() => speak(cur.said, { rate: settings.rate * 0.9 })}><Bi k="listen" inline /></button></div>
          <div className="options pair-opts">
            {cur.items.map((w) => (
              <button key={w} type="button" lang="fr" disabled={!!pick}
                className={`opt${pick && w === cur.said ? ' good' : ''}${pick === w && w !== cur.said ? ' bad' : ''}`}
                onClick={() => { setPick(w); if (w === cur.said) setOk((n) => n + 1); }}>{w}</button>
            ))}
          </div>
          {pick && (
            <div className="game-fb">
              <div className="row">{cur.items.map((w) => <button key={w} type="button" className="btn ghost small" onClick={() => speak(w, { rate: settings.rate * 0.9 })} lang="fr">{w}</button>)}</div>
              <button type="button" className="btn primary" onClick={() => { if (i + 1 >= list.length) log(ok, list.length); setPick(null); setI(i + 1); }}><Bi k="next" inline /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Sentences for dictation: the examples of the grammar cards and the filled-in exercises (all with Turkish).
function sentencePool() {
  const out = [];
  const ok = (s) => s && /[.?!]$/.test(s) && !/[;→«]/.test(s) && s.length >= 10 && s.length <= 70;
  for (const ch of CHAPTERS) {
    for (const r of ch.rules) for (const x of r.ex || []) {
      const s = x.s || (x.g ? `${x.g.map((g) => g[0]).join(' ').replace(/' /g, "'")}.` : '');
      for (const part of (x.s ? s.split(/(?<=[.?!])\s+/) : [s])) if (ok(part)) out.push({ s: part, tr: x.s && s !== part ? '' : x.tr });
    }
    for (const e of ch.ex) if (e.t === 'choice' && e.q.includes('___') && !/[()]/.test(e.q)) { const s = filled(e.q, e.o[e.a]); if (ok(s)) out.push({ s, tr: e.tr }); }
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.s) ? false : seen.add(x.s)));
}

// Whole-sentence pronunciation in Turkish letters, word by word (no liaisons).
async function sentencePron(text) {
  const parts = [];
  for (const t of tokenize(text)) {
    if (!t.word) continue;
    const e = (await lookupWord(t.text))[0];
    parts.push(e?.ph ? toTK(e.ph) : t.text);
  }
  return parts.join(' ');
}

const words = (s) => norm(s).replace(/[.,!?;:«»"]/g, '').replace(/’/g, "'").split(' ').filter(Boolean);

// Dictée: listen, write. Mode 'words' (with the article) or 'sentences'.
export function Dictation({ mode = 'sentences', rounds = 6 }) {
  const { settings, cards } = useApp();
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => {
    if (mode === 'words') {
      const learned = Object.values(WORDS).filter((w) => cards.has(`word:${w.fr}`) && w.t !== 'expr');
      const pool = learned.length >= rounds ? learned : Object.values(WORDS).filter((w) => isNoun(w) && !/^[A-ZÉ]/.test(w.fr));
      return shuffle(pool).slice(0, rounds).map((w) => ({ w, s: label(w).replace(' / ', ', '), tr: w.tr }));
    }
    return shuffle(sentencePool()).slice(0, rounds);
  }, [mode, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const [pron, setPron] = useState('');
  const [ok, setOk] = useState(0);
  const field = useRef(null);
  const log = useGameLog(mode === 'words' ? 'dictation-words' : 'dictation');
  const cur = list[i];
  useEffect(() => { if (cur) { speak(cur.s, { rate: settings.rate }); setTimeout(() => field.current?.focus({ preventScroll: true }), 50); } }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) {
    return <div className="game-end"><p className="big-num">{ok} / {list.length}</p><button type="button" className="btn primary" onClick={() => { setSeed((x) => x + 1); setI(0); setOk(0); setRes(null); setVal(''); }}><Bi k="play_again" inline /></button></div>;
  }
  const check = () => {
    if (res) return;
    let r;
    if (mode === 'words') {
      const g = gradeWord(val, cur.w);
      r = { k: g.k, why: g.why };
    } else {
      const want = words(cur.s); const got = words(val);
      const marks = want.map((w, k) => (got[k] === w ? 'ok' : got[k] && strip(got[k]) === strip(w) ? 'near' : 'bad'));
      const extra = got.slice(want.length);
      r = { k: marks.every((m) => m === 'ok') && !extra.length ? 'ok' : marks.every((m) => m !== 'bad') && !extra.length ? 'near' : 'bad', marks, got, want, extra };
    }
    setRes(r);
    if (r.k === 'ok') setOk((n) => n + 1);
    sentencePron(cur.s).then(setPron).catch(() => setPron(''));
  };
  const next = () => { if (i + 1 >= list.length) log(ok, list.length); setRes(null); setVal(''); setPron(''); setI(i + 1); };
  return (
    <div className="game dict">
      <div className="game-top"><span>{i + 1} / {list.length}</span><span>{ok} ✓</span></div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn ghost" onClick={() => speak(cur.s, { rate: settings.rate })}><Bi k="listen" inline /></button>
        <button type="button" className="btn ghost" onClick={() => speak(cur.s, { rate: Math.max(0.55, settings.rate - 0.3) })}><Bi k="slow" inline /></button>
      </div>
      <AccentBar />
      <input ref={field} data-fr="" lang="fr" className={`field big-field${res ? ` r-${res.k}` : ''}`} value={val} disabled={!!res}
        placeholder={mode === 'words' ? 'le / la / un / une …' : ''} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); res ? next() : check(); } }} />
      {!res && <button type="button" className="btn primary" onClick={check}><Bi k="check" inline /></button>}
      {res && (
        <div className="wfb">
          <span className={`chip c-${res.k}`}><Bi k={res.k === 'ok' ? 'fb_ok' : res.k === 'near' ? 'fb_accent' : 'fb_bad'} inline /></span>
          {mode === 'sentences' && (
            <p className="dict-out" lang="fr">{res.want.map((w, k) => (
              <span key={k} className={`dw ${res.marks[k]}`}>{res.marks[k] === 'ok' ? w : <><s>{res.got[k] || '…'}</s> {w}</>}</span>
            ))}{res.extra.map((w, k) => <span key={`x${k}`} className="dw bad"><s>{w}</s></span>)}</p>
          )}
          {mode === 'words' ? <WordLabel w={cur.w} big /> : <p className="dict-right"><Words text={cur.s} /></p>}
          {pron && <p className="small"><span className="tk">{pron}</span></p>}
          {cur.tr && <p className="ann-tr" lang="tr">{cur.tr}</p>}
          <button type="button" className="btn primary" onClick={next}><Bi k="next" inline /></button>
        </div>
      )}
    </div>
  );
}
