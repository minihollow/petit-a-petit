import { CHAPTERS, gramCardId } from '../lib/grammar.js';
import { level } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi } from '../components/ui.jsx';

export default function Grammar() {
  const { cards, go } = useApp();
  const levels = [...new Set(CHAPTERS.map((c) => c.level))];
  return (
    <div className="page grammar">
      <h1><Bi k="nav_grammar" /></h1>
      <p className="small"><Bi k="grammar_intro" /></p>
      {levels.map((lv) => (
        <section key={lv} className="block">
          <h2>{lv}</h2>
          <ul className="chlist">
            {CHAPTERS.filter((c) => c.level === lv).map((c) => (
              <li key={c.id}>
                <button type="button" className="chrow" onClick={() => go('chapter', { id: c.id })}>
                  <span className={`dot l${level(cards.get(gramCardId(c.id)))}`} aria-hidden="true" />
                  <span className="chrow-main"><span lang="fr">{c.fr}</span><span className="chrow-tr" lang="tr">{c.tr}</span></span>
                  <span className="muted small">{c.ex.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
