import { CHAPTER_BY_ID, gramCardId } from '../lib/grammar.js';
import { nextInDays } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Example } from '../components/Gram.jsx';
import { Bi, Icon, tx } from '../components/ui.jsx';

// A rule card, the way a reference grammar shows it: what to know, numbered rules with annotated
// examples, formulas, exceptions, the Turkish comparison, and how to recognise.
export default function Chapter({ id }) {
  const { settings, cards, go } = useApp();
  const ch = CHAPTER_BY_ID.get(id);
  if (!ch) return null;
  const card = cards.get(gramCardId(id));
  const T = ({ pair }) => <>{<span lang="fr">{pair[0]}</span>}{settings.help && <span className="tr-t" lang="tr">{pair[1]}</span>}</>;
  return (
    <div className="page chapter">
      <button type="button" className="link back" onClick={() => history.back()}><Icon name="back" size={18} /> <Bi k="nav_grammar" inline /></button>
      <p className="lvl-line small">Niveau {ch.level}{settings.help && <span className="tr-i" lang="tr">{ch.level} seviyesi</span>}</p>
      <h1><Bi pair={[ch.fr, ch.tr]} /></h1>

      <div className="know">
        <div className="know-h"><Bi k="know_title" inline /></div>
        <ul>{ch.know.map((k, i) => <li key={i}><T pair={k} /></li>)}</ul>
      </div>

      {ch.rules.map((r) => (
        <section key={r.id} className="rule">
          <span className="rid">{r.id}</span>
          <div className="rule-body">
            <p className="rule-t"><T pair={[r.fr, r.tr]} /></p>
            {r.formula && <div className="formula"><T pair={r.formula} /></div>}
            {r.ex?.map((x, i) => <Example key={i} ex={x} />)}
            {r.warn && <p className="warn"><span className="tri">⚠</span><span><T pair={r.warn} /></span></p>}
            {r.tip && <p className="tip"><span className="tip-l">TR</span><span><T pair={r.tip} /></span></p>}
          </div>
        </section>
      ))}

      {ch.algo && (
        <section className="block">
          <h2><Bi k="how_to" /></h2>
          <ol className="algo">{ch.algo.map((a, i) => <li key={i}><span><T pair={a} /></span></li>)}</ol>
        </section>
      )}

      {id === 'nombre' && <button type="button" className="btn ghost" onClick={() => go('rules')}><Bi k="gender_rules" /></button>}
      {card && <p className="muted small"><Bi k="next_review" inline /> : {nextInDays(card) === 0 ? <Bi k="today_word" inline /> : <Bi pair={tx('in_days', nextInDays(card))} inline />}</p>}
      <button type="button" className="btn big" onClick={() => go('session', { items: [gramCardId(id)] })}>
        <Bi k="practice_ch" /><span className="btn-meta">{ch.ex.length} <Bi k="exercises_n" inline /></span>
      </button>
    </div>
  );
}
