import { useState } from 'react';
import { TENSE_ORDER, TENSES, tableRows, tenseApplies } from '../lib/conj.js';
import { cardId } from '../lib/plan.js';
import { level, nextInDays } from '../lib/srs.js';
import { useApp } from '../store.js';
import ConjTable from '../components/ConjTable.jsx';
import TenseHead from '../components/TenseHead.jsx';
import { Bi, Icon, Parts, tx } from '../components/ui.jsx';
import { splitParticiple } from '../lib/conj.js';

export default function Verb({ inf }) {
  const { byInf, lookup, cards, go, settings } = useApp();
  const v = byInf.get(inf);
  const tenses = v ? TENSE_ORDER.filter((t) => tenseApplies(v, t)) : [];
  const [tense, setTense] = useState(tenses[0]);
  if (!v) return null;
  const rows = tableRows(v, tense, lookup);
  const card = cards.get(cardId(inf, tense));
  return (
    <div className="page verb">
      <button type="button" className="link back" onClick={() => history.back()}><Icon name="back" size={18} /> <Bi k="nav_verbs" inline /></button>
      <div className="vinfo small">
        <span><Bi k="group" inline /> {v.group}</span>
        <span><Bi k="aux" inline /> <b lang="fr">{v.aux}</b></span>
        {v.pp && <span><Bi k="pp" inline /> <Parts parts={splitParticiple(v.pp[0])} /></span>}
        {v.pron && <span><Bi k="pron_verb" inline /></span>}
        {v.only3s && <span><Bi k="impersonal" inline /></span>}
      </div>
      {v.note && settings.help && <p className="note small" lang="tr">{v.note}</p>}
      <div className="tabs-row" role="tablist">
        {tenses.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === tense} className={`ttab${t === tense ? ' on' : ''}`} onClick={() => setTense(t)}>
            <span className={`dot l${level(cards.get(cardId(inf, t)))}`} />{TENSES[t].fr}
          </button>
        ))}
      </div>
      <TenseHead key={tense} verb={v} tense={tense} />
      <ConjTable rows={rows} />
      {card && <p className="muted small"><Bi k="next_review" inline /> : {nextInDays(card) === 0 ? <Bi k="today_word" inline /> : <Bi pair={tx('in_days', nextInDays(card))} inline />}</p>}
      <button type="button" className="btn big" onClick={() => go('session', { items: [cardId(inf, tense)] })}><Bi k="practice" /></button>
    </div>
  );
}
