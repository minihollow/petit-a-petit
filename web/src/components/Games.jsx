import { useEffect, useMemo, useRef, useState } from 'react';
import { elides, genderOf, isNoun, label } from '../lib/vocab.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { Bi, SpeakBtn } from './ui.jsx';
import { RuleLine, WordLabel } from './WordCard.jsx';

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const sayOf = (w) => (isNoun(w) ? label(w).replace(' / ', ', ') : w.fr);

function useGameLog(name) {
  const { logGame } = useApp();
  const start = useRef(Date.now());
  return (ok, n) => { logGame({ game: name, ok, n, ms: Date.now() - start.current }); start.current = Date.now(); };
}

function End({ ok, n, onAgain }) {
  return (
    <div className="game-end">
      <p className="big-num">{ok} / {n}</p>
      <p><Bi k={ok === n ? 'well_done' : 'score'} inline /></p>
      <button type="button" className="btn" onClick={onAgain}><Bi k="play_again" inline /></button>
    </div>
  );
}

// Le ou la ? Nouns only; for a noun starting with a vowel, un or une (l' hides the gender).
export function GenderGame({ words, rounds = 10 }) {
  const { settings } = useApp();
  const pool = useMemo(() => words.filter((w) => (w.t === 'm' || w.t === 'f') && !/^[A-ZÉ]/.test(w.fr)), [words]);
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => shuffle(pool).slice(0, rounds), [pool, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [ok, setOk] = useState(0);
  const log = useGameLog('gender');
  if (!list.length) return null;
  if (i >= list.length) return <End ok={ok} n={list.length} onAgain={() => { setSeed((s) => s + 1); setI(0); setOk(0); setPick(null); }} />;
  const w = list[i];
  const vowel = elides(w);
  const choose = (g) => {
    if (pick) return;
    setPick(g);
    if (g === genderOf(w)) setOk((n) => n + 1);
    speak(sayOf(w), { rate: settings.rate });
  };
  const next = () => { if (i + 1 >= list.length) log(ok, list.length); setPick(null); setI(i + 1); };
  return (
    <div className="game">
      <div className="game-top"><span>{i + 1} / {list.length}</span><span>{ok} ✓</span></div>
      <div className="game-word"><span lang="fr">{w.fr}</span><SpeakBtn text={w.fr} /></div>
      <p className="wcard-tr" lang="tr">{w.tr}</p>
      <div className="gbtns">
        <button type="button" className={`gb m${pick === 'm' ? ' picked' : ''}`} disabled={!!pick} onClick={() => choose('m')}>{vowel ? 'un' : 'le'}<small>masculin · eril</small></button>
        <button type="button" className={`gb f${pick === 'f' ? ' picked' : ''}`} disabled={!!pick} onClick={() => choose('f')}>{vowel ? 'une' : 'la'}<small>féminin · dişil</small></button>
      </div>
      {pick && (
        <div className="game-fb">
          <span className={`chip c-${pick === genderOf(w) ? 'ok' : 'bad'}`}><Bi k={pick === genderOf(w) ? 'fb_ok' : 'fb_gender'} inline /></span>
          <WordLabel w={w} big />
          <RuleLine w={w} />
          <button type="button" className="btn" onClick={next}><Bi k="next" inline /></button>
        </div>
      )}
    </div>
  );
}

// Associer: tap a French word, then its meaning.
export function MatchGame({ words, size = 6 }) {
  const { settings } = useApp();
  const [seed, setSeed] = useState(0);
  const set = useMemo(() => shuffle(words.filter((w) => w.t !== 'expr' || w.fr.length < 22)).slice(0, size), [words, size, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState(new Set());
  const [err, setErr] = useState(null);
  const [miss, setMiss] = useState(0);
  const log = useGameLog('match');
  useEffect(() => { if (set.length && done.size === set.length) log(Math.max(0, set.length - miss), set.length); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  if (set.length && done.size === set.length) return <End ok={Math.max(0, set.length - miss)} n={set.length} onAgain={() => { setSeed((s) => s + 1); setDone(new Set()); setSel(null); setMiss(0); }} />;
  return (
    <div className="game">
      <p className="small muted"><Bi k="game_match_desc" inline /></p>
      <div className="match">
        <div className="match-col">
          {set.map((w) => (
            <button key={w.fr} type="button" className={`mt${sel === w.fr ? ' sel' : ''}${done.has(w.fr) ? ' done' : ''}`} disabled={done.has(w.fr)}
              onClick={() => { setSel(w.fr); speak(sayOf(w), { rate: settings.rate }); }}><WordLabel w={w} /></button>
          ))}
        </div>
        <div className="match-col">
          {right.map((w) => (
            <button key={w.fr} type="button" lang="tr" className={`mt${done.has(w.fr) ? ' done' : ''}${err === w.fr ? ' err' : ''}`} disabled={done.has(w.fr)}
              onClick={() => {
                if (!sel) return;
                if (sel === w.fr) { setDone((d) => new Set(d).add(w.fr)); setSel(null); }
                else { setErr(w.fr); setMiss((m) => m + 1); setTimeout(() => setErr(null), 600); }
              }}>{w.tr}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Écouter et trouver: the word is read, choose its meaning among four.
export function ListenGame({ words, rounds = 8 }) {
  const { settings } = useApp();
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => shuffle(words).slice(0, rounds), [words, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [ok, setOk] = useState(0);
  const log = useGameLog('listen');
  const w = list[i];
  const options = useMemo(() => (w ? shuffle([w, ...shuffle(words.filter((x) => x.fr !== w.fr && x.tr !== w.tr)).slice(0, 3)]) : []), [w, words]);
  useEffect(() => { if (w) speak(sayOf(w), { rate: settings.rate }); }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list.length) return null;
  if (i >= list.length) return <End ok={ok} n={list.length} onAgain={() => { setSeed((s) => s + 1); setI(0); setOk(0); setPick(null); }} />;
  return (
    <div className="game">
      <div className="game-top"><span>{i + 1} / {list.length}</span><span>{ok} ✓</span></div>
      <div className="game-word"><button type="button" className="btn ghost" onClick={() => speak(sayOf(w), { rate: settings.rate })}><Bi k="listen" inline /></button></div>
      <div className="options">
        {options.map((o) => (
          <button key={o.fr} type="button" lang="tr" disabled={!!pick}
            className={`opt${pick && o.fr === w.fr ? ' good' : ''}${pick === o.fr && o.fr !== w.fr ? ' bad' : ''}`}
            onClick={() => { setPick(o.fr); if (o.fr === w.fr) setOk((n) => n + 1); }}>{o.tr}</button>
        ))}
      </div>
      {pick && (
        <div className="game-fb">
          <WordLabel w={w} big />
          <button type="button" className="btn" onClick={() => { if (i + 1 >= list.length) log(ok, list.length); setPick(null); setI(i + 1); }}><Bi k="next" inline /></button>
        </div>
      )}
    </div>
  );
}
