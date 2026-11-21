import { useState } from 'react';
import { TENSES } from '../lib/conj.js';
import { useApp } from '../store.js';
import { Bi, SpeakBtn } from './ui.jsx';
import Words from './Words.jsx';

// Verb + tense header, with the formula (French, Turkish help) and the closest Turkish form.
export default function TenseHead({ verb, tense, formulaOpen = true }) {
  const { settings } = useApp();
  const T = TENSES[tense];
  const [open, setOpen] = useState(formulaOpen);
  return (
    <div className="thead">
      <div className="thead-verb">
        <span className="vinf" lang="fr">{verb.pron ? (/^[aeiouyhéèê]/i.test(verb.inf) ? "s'" : 'se ') : ''}{verb.inf}</span>
        <SpeakBtn text={(verb.pron ? (/^[aeiouyhéèê]/i.test(verb.inf) ? "s'" : 'se ') : '') + verb.inf} />
        <span className="vtr" lang="tr">{verb.tr}</span>
      </div>
      <div className="thead-tense">
        <span className="tname" lang="fr">{T.fr}</span>
        {settings.help && <span className="tname-tr" lang="tr">{T.tr} · {T.eq}</span>}
        <button type="button" className="link" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Bi k="hint" inline /></button>
      </div>
      {open && (
        <div className="formula">
          <span lang="fr">{T.f[0]}</span>
          {settings.help && <span className="tr-t" lang="tr">{T.f[1]}</span>}
          <span className="formula-ex"><Words text={T.ex[0]} />{settings.help && <span lang="tr"> = {T.ex[1]}</span>}</span>
        </div>
      )}
    </div>
  );
}
