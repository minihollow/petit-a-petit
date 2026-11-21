import { useEffect, useMemo, useRef, useState } from 'react';
import { filled, gradeTyped, LABELS, pickExercises, shuffledOptions } from '../lib/grammar.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { AccentBar, Bi, SpeakBtn, TrBtn, TrLine, TrScope, Tx, useMode, useTrOpen } from './ui.jsx';
import Words from './Words.jsx';

// Sentence cut into groups, each underlined with its role under it (French, Turkish).
export function Annotated({ groups, tr }) {
  return <TrScope><AnnotatedIn groups={groups} tr={tr} /></TrScope>;
}
function AnnotatedIn({ groups, tr }) {
  const mode = useMode();
  const open = useTrOpen();
  const sentence = groups.map((g) => g[0]).join(' ').replace(/' /g, "'");
  return (
    <div className="annot">
      <div className="ann" lang="fr">
        {groups.map(([text, role], i) => (
          <span key={i} className="grp">
            <span className="gw"><Words text={text} /></span>
            {role && <span className="gl">{LABELS[role]?.[0]}</span>}
            {role && (mode === 'tr' || (mode === 'bi' && open)) && <span className="gl2" lang="tr">{LABELS[role]?.[1]}</span>}
          </span>
        ))}
        <SpeakBtn text={sentence} />
        {tr && <TrBtn />}
      </div>
      {tr && <div className="ann-tr"><TrLine>{tr}</TrLine></div>}
    </div>
  );
}

export function Example({ ex }) {
  if (ex.g) return <Annotated groups={ex.g} tr={ex.tr} />;
  return (
    <TrScope>
      <div className="annot">
        <div className="ann-plain"><Words text={ex.s} /> <SpeakBtn text={ex.s} />{ex.tr && <TrBtn />}</div>
        {ex.tr && <div className="ann-tr"><TrLine>{ex.tr}</TrLine></div>}
      </div>
    </TrScope>
  );
}

function Why({ why, children }) {
  if (!why && !children) return null;
  return (
    <div className="why small">
      {children}
      {why && <p><Tx v={why} /></p>}
    </div>
  );
}

function Choice({ e, onAnswer }) {
  const opts = useMemo(() => shuffledOptions(e), [e]);
  const [pick, setPick] = useState(null);
  const right = e.o[e.a];
  return (
    <div className="gx">
      <p className="gx-q" lang="fr">{e.q.split('___').map((p, i, a) => <span key={i}>{p}{i < a.length - 1 && <span className={`blank${pick ? ' on' : ''}`}>{pick ? right : '…'}</span>}</span>)}</p>
      <div className="options">
        {opts.map((o) => (
          <button key={o.text} type="button" lang="fr" disabled={!!pick}
            className={`opt${pick && o.right ? ' good' : ''}${pick === o.text && !o.right ? ' bad' : ''}`}
            onClick={() => { setPick(o.text); onAnswer(o.right ? 'ok' : 'bad', filled(e.q, right)); }}>{o.text}</button>
        ))}
      </div>
      {pick && <Why why={e.why}><p className="ann-tr"><TrLine always>{e.tr}</TrLine></p></Why>}
    </div>
  );
}

function Typed({ e, onAnswer }) {
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const field = useRef(null);
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  const check = () => { if (res) return; const g = gradeTyped(val, e); setRes(g); onAnswer(g.k, filled(e.q, e.a[0])); };
  return (
    <div className="gx">
      <p className="gx-q" lang="fr">{e.q}</p>
      <AccentBar />
      <div className="row">
        <input ref={field} data-fr="" lang="fr" className={`field${res ? ` r-${res.k}` : ''}`} value={val} disabled={!!res} style={{ flex: 1 }}
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(x) => setVal(x.target.value)}
          onKeyDown={(x) => { if (x.key === 'Enter') { x.preventDefault(); check(); } }} />
        {!res && <button type="button" className="btn primary" onClick={check}><Bi k="check" inline /></button>}
      </div>
      {res && (
        <Why why={e.why}>
          <p><span className={`chip c-${res.k}`}><Bi k={res.k === 'ok' ? 'fb_ok' : res.why === 'accent' ? 'fb_accent' : 'fb_bad'} inline /></span> <b lang="fr">{e.a[0]}</b></p>
          <p className="ann-tr"><TrLine always>{e.tr}</TrLine></p>
        </Why>
      )}
    </div>
  );
}

function Detect({ e, onAnswer }) {
  const mode = useMode();
  const [roles, setRoles] = useState({});
  const [done, setDone] = useState(false);
  const all = e.g.every((_, i) => roles[i]);
  const check = () => {
    setDone(true);
    const ok = e.g.every(([, r], i) => roles[i] === r);
    onAnswer(ok ? 'ok' : 'bad', e.g.map((g) => g[0]).join(' '));
  };
  return (
    <div className="gx">
      <p className="small muted"><Bi k="choose_role" inline tip /></p>
      <div className="det">
        {e.g.map(([text, role], i) => (
          <div key={i} className="det-g">
            <span className="gt" lang="fr">{text}</span>
            <div className="seg det-seg" role="group" aria-label={text}>
              {e.opts.map((o) => (
                <button key={o} type="button" disabled={done} aria-pressed={roles[i] === o}
                  className={done ? (o === role ? 'good' : roles[i] === o ? 'bad' : '') : ''}
                  onClick={() => setRoles((r) => ({ ...r, [i]: o }))}>
                  {LABELS[o]?.[0]}{mode !== 'fr' && <span className="tr-i" lang="tr">{LABELS[o]?.[1]}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!done && <button type="button" className="btn primary" disabled={!all} onClick={check}><Bi k="check" inline /></button>}
      {done && <><Annotated groups={e.g} tr={e.tr} /></>}
    </div>
  );
}

// A run of exercises of one chapter. onDone({ ok, near, n, ms }).
export default function GramSession({ chapter, count, onDone }) {
  const { settings } = useApp();
  const [list] = useState(() => pickExercises(chapter, count));
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState(null);
  const score = useRef({ ok: 0, near: 0 });
  const start = useRef(Date.now());
  const e = list[i];
  const answer = (k, sentence) => {
    setAnswered(k);
    if (k === 'ok') score.current.ok++; else if (k === 'near') score.current.near++;
    if (sentence) speak(sentence, { rate: settings.rate });
  };
  const next = () => {
    if (i + 1 >= list.length) { onDone({ ...score.current, n: list.length, ms: Date.now() - start.current }); return; }
    setAnswered(null); setI(i + 1);
  };
  return (
    <div className="gram-run">
      <div className="game-top"><span><Bi pair={[chapter.fr, chapter.tr]} /></span><span>{i + 1} / {list.length}</span></div>
      {e.t === 'choice' && <Choice key={i} e={e} onAnswer={answer} />}
      {e.t === 'type' && <Typed key={i} e={e} onAnswer={answer} />}
      {e.t === 'detect' && <Detect key={i} e={e} onAnswer={answer} />}
      {answered && <div className="drill-actions"><button type="button" className="btn primary" onClick={next}><Bi k="next" /></button></div>}
    </div>
  );
}
