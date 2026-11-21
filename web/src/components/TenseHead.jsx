import { useState } from 'react';
import { TENSES } from '../lib/conj.js';
import { Bi, SpeakBtn, TrBtn, TrLine, TrScope } from './ui.jsx';
import Words from './Words.jsx';

// Verb + tense header, with the formula (French, Turkish help) and the closest Turkish form.
export default function TenseHead({ verb, tense, formulaOpen = true }) {
  const T = TENSES[tense];
  const [open, setOpen] = useState(formulaOpen);
  return (
    <TrScope>
    <div className="thead">
      <div className="thead-verb">
        <span className="vinf" lang="fr">{verb.pron ? (/^[aeiouyhéèê]/i.test(verb.inf) ? "s'" : 'se ') : ''}{verb.inf}</span>
        <SpeakBtn text={(verb.pron ? (/^[aeiouyhéèê]/i.test(verb.inf) ? "s'" : 'se ') : '') + verb.inf} />
        <span className="vtr" lang="tr">{verb.tr}</span>
      </div>
      <div className="thead-tense">
        <span className="tname" lang="fr">{T.fr}</span>
        <TrLine inline>{T.tr} · {T.eq}</TrLine>
        <button type="button" className="link" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Bi k="hint" inline /></button>
        <TrBtn />
      </div>
      {open && (
        <div className="formula">
          <span lang="fr">{T.f[0]}</span>
          <TrLine>{T.f[1]}</TrLine>
          <span className="formula-ex"><Words text={T.ex[0]} /><TrLine inline>{T.ex[1]}</TrLine></span>
        </div>
      )}
    </div>
    </TrScope>
  );
}
