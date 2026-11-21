import { GENDER_RULES, WORDS } from '../lib/vocab.js';
import { GenderGame } from '../components/Games.jsx';
import { Bi, Icon } from '../components/ui.jsx';
import { useState } from 'react';

// Gender of nouns by their ending, with real percentages: the most "mathematical" page.
export default function GenderRules() {
  const [play, setPlay] = useState(false);
  const nouns = Object.values(WORDS).filter((w) => (w.t === 'm' || w.t === 'f') && !/^[A-ZÉ]/.test(w.fr));
  return (
    <div className="page rules">
      <button type="button" className="link back" onClick={() => history.back()}><Icon name="back" size={18} /> <Bi k="nav_words" inline /></button>
      <h1><Bi k="gender_rules" /></h1>
      <p className="small"><Bi k="rules_intro" /></p>
      <button type="button" className="btn" onClick={() => setPlay((p) => !p)}><Bi k="game_gender" /></button>
      {play && <GenderGame words={nouns} rounds={15} />}
      <div className="conj-wrap">
        <table className="rtable">
          <thead><tr><th lang="fr">fin</th><th><Bi k="masc" inline /> / <Bi k="fem" inline /></th><th><Bi k="examples" inline /></th><th><Bi k="exceptions" inline /></th></tr></thead>
          <tbody>
            {GENDER_RULES.map((r) => (
              <tr key={r.e}>
                <td className="r-end" lang="fr">-{r.e}</td>
                <td><span className={`gpill ${r.g}`}>{r.g === 'm' ? 'masc.' : 'fém.'} {r.pct} %</span><div className="muted small">{r.n} <Bi k="rules_words" inline /></div></td>
                <td lang="fr" className="small">{r.ex.slice(0, 3).map((x) => `${r.g === 'm' ? 'le' : 'la'} ${x}`).join(', ').replace(/\b(le|la) ([aeiouyhéèêîôœ])/gi, "l'$2")}</td>
                <td lang="fr" className="small exc">{r.exc.length ? r.exc.join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
