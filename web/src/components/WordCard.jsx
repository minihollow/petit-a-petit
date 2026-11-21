import { useEffect, useRef, useState } from 'react';
import { answerOf, genderOf, gradeWord, isNoun, label, posLabel, ruleFor } from '../lib/vocab.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { AccentBar, Bi, Pron, SpeakBtn, useMode } from './ui.jsx';
import { AskCoco } from './Coco.jsx';
import { wordContext } from '../lib/coco.js';
import { UI } from '../i18n.js';

// "le chien" with the article coloured by gender.
export function WordLabel({ w, big = false }) {
  const g = genderOf(w);
  return <span className={`wl${big ? ' big' : ''}${g ? ` g-${g}` : ''}`} lang="fr">{label(w)}</span>;
}
const sayText = (w) => (isNoun(w) ? label(w).replace(' / ', ', ') : w.fem ? `${w.fr}, ${w.fem}` : w.fr);

// The gender rule of a noun's ending, in one line.
export function RuleLine({ w }) {
  const r = ruleFor(w);
  if (!isNoun(w) || w.t === 'mf' || w.t.endsWith('pl')) return null;
  if (!r) return <p className="rule-line small"><Bi k="no_rule" inline /></p>;
  return (
    <p className={`rule-line small${r.follows ? '' : ' exc'}`}>
      <b lang="fr">-{r.e}</b> → <span className={`g-${r.g}`}>{r.g === 'm' ? 'masculin · eril' : 'féminin · dişil'}</span> {r.pct} % ({r.n})
      {' · '}{r.follows ? <Bi k="rule_follows" inline /> : <b><Bi k="rule_exception" inline /></b>}
    </p>
  );
}

function Details({ w }) {
  const pos = posLabel(w);
  const mode = useMode();
  return (
    <>
      <p className="small muted">{mode === 'tr' ? <span lang="tr">{pos[1]}</span> : pos[0]}</p>
      <div className="row"><Pron phon={w.ph} />{w.fem && <span className="small">· <span lang="fr">{w.fem}</span> <Pron phon={w.femPh} /></span>}
        {w.pl && <span className="small">· <Bi k="plural" inline /> : <span lang="fr">{w.pl}</span> <Pron phon={w.plPh} /></span>}</div>
      {w.note && <p className="note small" lang="tr">{w.note}</p>}
      <RuleLine w={w} />
    </>
  );
}

// A new word: shown and read first.
export function WordLearn({ w, onNext }) {
  const { settings } = useApp();
  useEffect(() => { speak(sayText(w), { rate: settings.rate }); }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="wcard">
      <p className="learn-tag"><b><Bi k="learn" inline /></b></p>
      <div className="wcard-main"><WordLabel w={w} big /><SpeakBtn text={sayText(w)} /></div>
      <p className="wcard-tr" lang="tr">{w.tr}</p>
      <Details w={w} />
      <button type="button" className="btn primary big" onClick={onNext}><Bi k="next" /></button>
    </div>
  );
}

const FB = { accent: 'fb_accent', article: 'fb_article', hidden: 'fb_hidden', gender: 'fb_gender', empty: 'fb_empty' };

// Turkish -> French, typed with the article. onDone({ ok, near, n: 1, ms }).
export function WordDrill({ w, onDone }) {
  const { settings } = useApp();
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const field = useRef(null);
  const next = useRef(null);
  const start = useRef(Date.now());
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (res) next.current?.focus({ preventScroll: true }); }, [res]);
  const check = () => { const g = gradeWord(val, w); setRes(g); speak(sayText(w), { rate: settings.rate }); };
  return (
    <div className="wcard">
      <p className="small muted"><Bi k={isNoun(w) ? 'type_answer' : 'type_answer_plain'} inline tip /></p>
      <p className="wcard-q" lang="tr">{w.tr}</p>
      <p className="small muted">{posLabel(w)[0]} · <span lang="tr">{posLabel(w)[1]}</span></p>
      <AccentBar />
      <input ref={field} data-fr="" lang="fr" className={`field big-field${res ? ` r-${res.k}` : ''}`} value={val} disabled={!!res}
        autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done"
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!res) check(); } }} />
      {res && (
        <div className="wfb">
          <span className={`chip c-${res.k}`}><Bi k={res.k === 'ok' ? 'fb_ok' : FB[res.why] || 'fb_bad'} inline /></span>
          <div className="wcard-main"><WordLabel w={w} big /><SpeakBtn text={sayText(w)} /></div>
          {answerOf(w) !== label(w) && <p className="small muted" lang="fr">{answerOf(w)}</p>}
          <Details w={w} />
          {res.k !== 'ok' && <AskCoco build={() => wordContext({ w, answer: val, grade: res, expected: answerOf(w) })} ask={UI.coco_q_word[1]} />}
        </div>
      )}
      <div className="drill-actions">
        {!res ? <button type="button" className="btn primary" onClick={check}><Bi k="check" /></button>
          : <button type="button" ref={next} className="btn primary" onClick={() => onDone({ ok: res.k === 'ok' ? 1 : 0, near: res.k === 'near' ? 1 : 0, n: 1, ms: Date.now() - start.current })}><Bi k="next" /></button>}
      </div>
    </div>
  );
}
