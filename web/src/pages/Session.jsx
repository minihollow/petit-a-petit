import { useState } from 'react';
import { tableRows } from '../lib/conj.js';
import { parseCard } from '../lib/plan.js';
import { nextInDays, Rating, ratingFor } from '../lib/srs.js';
import { parseWordCard } from '../lib/vocab.js';
import { useApp } from '../store.js';
import ConjTable from '../components/ConjTable.jsx';
import Drill from '../components/Drill.jsx';
import TenseHead from '../components/TenseHead.jsx';
import { WordDrill, WordLearn } from '../components/WordCard.jsx';
import { Bi, Icon, tx } from '../components/ui.jsx';

// A series of cards: conjugation tables and words. A new card is first shown, then asked from memory.
export default function Session({ items: asked, onEnd }) {
  const { byInf, lookup, cards, record } = useApp();
  const valid = (id) => {
    if (id.startsWith('word:')) return !!parseWordCard(id);
    const p = parseCard(id); const v = p && byInf.get(p.inf);
    return !!v && tableRows(v, p.tense, lookup).length > 0;
  };
  const [items] = useState(() => asked.filter(valid));
  const [isNew] = useState(() => new Set(items.filter((id) => !cards.has(id))));
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(() => (isNew.has(items[0]) ? 'learn' : 'drill'));
  const [log, setLog] = useState([]);

  if (idx >= items.length) return <Summary log={log} onEnd={onEnd} />;
  const id = items[idx];

  const done = async (res) => {
    // A word: right = Good, accent / article slip = Hard, wrong = Again. A table: share of right forms.
    const rating = id.startsWith('word:') ? (res.ok ? Rating.Good : res.near ? Rating.Hard : Rating.Again) : ratingFor(res.ok, res.near, res.n);
    await record(id, { rating, ...res });
    setLog((l) => [...l, { id, ...res, rating }]);
    const nx = idx + 1;
    setIdx(nx);
    setStep(nx < items.length && isNew.has(items[nx]) ? 'learn' : 'drill');
    window.scrollTo({ top: 0 });
  };

  let body;
  const word = parseWordCard(id);
  if (word) {
    body = step === 'learn'
      ? <WordLearn key={`wl-${id}`} w={word} onNext={() => setStep('drill')} />
      : <WordDrill key={`wd-${id}`} w={word} onDone={done} />;
  } else {
    const { inf, tense } = parseCard(id);
    const verb = byInf.get(inf);
    const rows = tableRows(verb, tense, lookup);
    body = (
      <>
        <TenseHead key={`head-${id}`} verb={verb} tense={tense} formulaOpen={step === 'learn'} />
        {step === 'learn' ? (
          <div className="learn">
            <p className="learn-tag"><b><Bi k="learn" inline /></b> · <span className="small"><Bi k="learn_hint" inline /></span></p>
            <ConjTable rows={rows} />
            <button type="button" className="btn big" onClick={() => setStep('drill')}><Bi k="to_drill" /></button>
          </div>
        ) : <Drill key={`drill-${id}`} rows={rows} onDone={done} doneLabel="next" />}
      </>
    );
  }

  return (
    <div className="page session">
      <div className="sess-top">
        <button type="button" className="icon-btn" onClick={() => onEnd(log.length > 0)} aria-label="Arrêter / Bırak"><Icon name="back" /></button>
        <div className="sess-bar"><span style={{ width: `${(idx / items.length) * 100}%` }} /></div>
        <span className="sess-n">{idx + 1}/{items.length}</span>
      </div>
      {body}
    </div>
  );
}

function Summary({ log, onEnd }) {
  const { cards } = useApp();
  const ok = log.reduce((a, x) => a + x.ok, 0);
  const n = log.reduce((a, x) => a + x.n, 0);
  const min = Math.max(1, Math.round(log.reduce((a, x) => a + Math.min(x.ms, 300000), 0) / 60000));
  const next = log.map((x) => cards.get(x.id)).filter(Boolean).map((c) => nextInDays(c));
  const soonest = next.length ? Math.min(...next) : null;
  return (
    <div className="page summary">
      <h1><Bi k="series_done" /></h1>
      <p className="big-num">{ok} / {n}</p>
      <p><Bi k="score" inline /> · {min} min</p>
      {soonest !== null && (
        <p className="small"><Bi k="next_review" inline /> : {soonest === 0 ? <Bi k="today_word" inline /> : <Bi pair={tx('in_days', soonest)} inline />}</p>
      )}
      <button type="button" className="btn big" onClick={() => onEnd(true)}><Bi k="back_home" /></button>
    </div>
  );
}
