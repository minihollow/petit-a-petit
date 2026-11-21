import { CHAPTERS } from '../lib/grammar.js';
import { THEMES } from '../lib/vocab.js';
import { useApp } from '../store.js';
import { Bi, Icon, Meter, tx } from '../components/ui.jsx';

// The library: everything in the app, to look up or practise at any time, like a reference book.
export default function Library() {
  const { cards, verbs, go } = useApp();
  let conj = 0; let word = 0; let gram = 0;
  const verbSet = new Set();
  for (const id of cards.keys()) {
    if (id.startsWith('conj:')) { conj++; verbSet.add(id.split(':')[1]); } else if (id.startsWith('word:')) word++; else if (id.startsWith('gram:')) gram++;
  }
  const nWords = THEMES.reduce((a, t) => a + t.words.length, 0);
  const items = [
    { to: 'grammar', icon: 'rule', k: 'lib_grammar', d: 'lib_grammar_d', n: gram, of: CHAPTERS.length },
    { to: 'verbs', icon: 'table', k: 'lib_verbs', d: 'lib_verbs_d', n: verbSet.size, of: verbs.length },
    { to: 'words', icon: 'cards', k: 'lib_words', d: 'lib_words_d', n: word, of: nWords },
    { to: 'sounds', icon: 'sound', k: 'lib_sounds', d: 'lib_sounds_d' },
    { to: 'rules', icon: 'list', k: 'lib_gender', d: 'lib_gender_d' },
  ];
  return (
    <div className="page library">
      <div className="hello"><div><h1><Bi k="nav_library" dual /></h1><p className="muted"><Bi k="lib_intro" /></p></div></div>
      <div className="lib-grid">
        {items.map((it) => (
          <button key={it.to} type="button" className="lib-tile" onClick={() => go(it.to)}>
            <span className="lib-ico"><Icon name={it.icon} size={22} /></span>
            <span className="lib-main">
              <b><Bi k={it.k} /></b>
              <span className="muted small"><Bi k={it.d} /></span>
              {it.of ? <><Meter value={it.n} max={it.of} /><span className="small muted">{it.n} / {it.of} <Bi pair={tx('started')} inline /></span></> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
