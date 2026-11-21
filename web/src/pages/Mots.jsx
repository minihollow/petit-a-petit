import { THEMES, WORDS, wordCardId } from '../lib/vocab.js';
import { isKnown } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi } from '../components/ui.jsx';

export default function Mots() {
  const { cards, go } = useApp();
  return (
    <div className="page mots">
      <div className="row">
        <button type="button" className="btn ghost small" onClick={() => go('rules')}><Bi k="gender_rules" inline /></button>
        <button type="button" className="btn ghost small" onClick={() => go('sounds')}><Bi k="snd_link" inline /></button>
      </div>
      <h2><Bi k="themes" /></h2>
      <ul className="theme-grid">
        {THEMES.map((t) => {
          const ids = t.words.map(wordCardId);
          const started = ids.filter((id) => cards.has(id)).length;
          const known = ids.filter((id) => isKnown(cards.get(id))).length;
          return (
            <li key={t.id}>
              <button type="button" className="theme-card" onClick={() => go('theme', { id: t.id })}>
                <span className="tc-fr" lang="fr">{t.fr}</span>
                <span className="tc-tr" lang="tr">{t.tr}</span>
                <span className="tc-bar"><span style={{ width: `${(started / t.words.length) * 100}%` }} className="s" /><span style={{ width: `${(known / t.words.length) * 100}%` }} className="k" /></span>
                <span className="tc-n">{started}/{t.words.length} <Bi k="words_count" inline /></span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="muted small">{Object.keys(WORDS).length} <Bi k="words_count" inline /></p>
    </div>
  );
}
