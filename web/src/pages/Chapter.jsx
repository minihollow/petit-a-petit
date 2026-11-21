import { CHAPTER_BY_ID, gramCardId } from '../lib/grammar.js';
import { nextInDays } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Example } from '../components/Gram.jsx';
import { Bi, Icon, Tx, tx } from '../components/ui.jsx';

// The rule card, the way a reference grammar shows it: what to know, numbered rules with annotated
// examples, formulas, exceptions, the Turkish comparison, and how to recognise. Also used in the course lessons.
export function ChapterBody({ ch }) {
  return (
    <div className="chapter-body">
      <p className="lvl-line small"><Bi pair={[`Niveau ${ch.level}`, `${ch.level} seviyesi`]} /></p>
      <h2 className="ch-title"><Bi pair={[ch.fr, ch.tr]} dual /></h2>

      <div className="know">
        <div className="know-h"><Bi k="know_title" inline /></div>
        <ul>{ch.know.map((k, i) => <li key={i}><Tx v={k} /></li>)}</ul>
      </div>

      {ch.rules.map((r) => (
        <section key={r.id} className="rule">
          <span className="rid">{r.id}</span>
          <div className="rule-body">
            <p className="rule-t"><Tx v={[r.fr, r.tr]} /></p>
            {r.formula && <div className="formula"><Tx v={r.formula} /></div>}
            {r.ex?.map((x, i) => <Example key={i} ex={x} />)}
            {r.warn && <p className="warn"><span className="tri">⚠</span><span><Tx v={r.warn} /></span></p>}
            {r.tip && <p className="tip"><span className="tip-l">TR</span><span><Tx v={r.tip} /></span></p>}
          </div>
        </section>
      ))}

      {ch.algo && (
        <section className="block">
          <h3><Bi k="how_to" /></h3>
          <ol className="algo">{ch.algo.map((a, i) => <li key={i}><span><Tx v={a} /></span></li>)}</ol>
        </section>
      )}
    </div>
  );
}

export default function Chapter({ id }) {
  const { cards, go, back } = useApp();
  const ch = CHAPTER_BY_ID.get(id);
  if (!ch) return null;
  const card = cards.get(gramCardId(id));
  return (
    <div className="page chapter">
      <button type="button" className="link back" onClick={back}><Icon name="back" size={18} /> <Bi k="nav_grammar" inline /></button>
      <ChapterBody ch={ch} />
      {id === 'nombre' && <button type="button" className="btn" onClick={() => go('rules')}><Bi k="gender_rules" /></button>}
      {card && <p className="muted small"><Bi k="next_review" inline /> : {nextInDays(card) === 0 ? <Bi k="today_word" inline /> : <Bi pair={tx('in_days', nextInDays(card))} inline />}</p>}
      <button type="button" className="btn primary big" onClick={() => go('session', { items: [gramCardId(id)] })}>
        <Bi k="practice_ch" /><span className="btn-meta">{ch.ex.length} <Bi k="exercises_n" inline /></span>
      </button>
    </div>
  );
}
