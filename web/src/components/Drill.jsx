import { useEffect, useRef, useState } from 'react';
import { grade } from '../lib/conj.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { AccentBar, Bi, Parts, Pron, SpeakBtn } from './ui.jsx';
import { AskCoco } from './Coco.jsx';
import { UI } from '../i18n.js';

const FB = { ok: 'fb_ok', accent: 'fb_accent', agree: 'fb_agree', ending: 'fb_ending', aux: 'fb_aux', pp: 'fb_pp', bad: 'fb_bad', empty: 'fb_empty' };
const fbKey = (g) => FB[g.k === 'ok' ? 'ok' : g.why || g.k] || 'fb_bad';

// Fill in a whole table from memory. onDone({ ok, near, n, ms }) when the learner moves on.
// cocoCtx(answers, grades): the exercise described for Coco (computer only).
export default function Drill({ rows, onDone, doneLabel = 'next', cocoCtx }) {
  const { settings } = useApp();
  const [vals, setVals] = useState({});
  const [res, setRes] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const fields = useRef([]);
  const start = useRef(Date.now());
  const nextBtn = useRef(null);

  useEffect(() => { fields.current[0]?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (res) nextBtn.current?.focus({ preventScroll: true }); }, [res]);

  const check = () => {
    const r = rows.map((row) => grade(vals[row.i], row));
    setRes(r);
    const allOk = r.every((g) => g.k === 'ok');
    if (allOk) speak(rows.map((x) => x.say), { rate: settings.rate });
  };
  const finish = () => {
    const r = res || rows.map((row) => grade(vals[row.i], row));
    const ok = r.filter((g) => g.k === 'ok').length;
    const near = r.filter((g) => g.k === 'near').length;
    onDone({ ok: revealed ? Math.min(ok, 0) : ok, near: revealed ? 0 : near, n: rows.length, ms: Date.now() - start.current });
  };
  const score = res ? res.filter((g) => g.k === 'ok').length : 0;

  return (
    <div className="drill">
      <AccentBar />
      <div className="drill-rows">
        {rows.map((row, k) => {
          const g = res?.[k];
          return (
            <div key={row.i} className={`drow${g ? ` g-${g.k}` : ''}`}>
              <label className="lbl" htmlFor={`f${row.i}`} lang="fr">{row.label}</label>
              <input id={`f${row.i}`} ref={(el) => { fields.current[k] = el; }} data-fr="" lang="fr" className="field"
                value={vals[row.i] || ''} disabled={!!res} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                enterKeyHint={k === rows.length - 1 ? 'done' : 'next'}
                onChange={(e) => setVals((v) => ({ ...v, [row.i]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (k < rows.length - 1) fields.current[k + 1]?.focus();
                  else check();
                }} />
              {g && (
                <div className="dfb">
                  {!revealed && <span className={`chip c-${g.k}`}><Bi k={fbKey(g)} inline /></span>}
                  {(revealed || g.k !== 'ok') && <span className="answer"><Parts parts={row.parts} /></span>}
                  <Pron phon={row.phon} />
                  <SpeakBtn text={row.say} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="drill-actions">
        {!res && <button type="button" className="btn" onClick={check}><Bi k="check" /></button>}
        {!res && (
          <button type="button" className="btn ghost" onClick={() => { setRevealed(true); setVals(Object.fromEntries(rows.map((r) => [r.i, r.answer]))); setRes(rows.map(() => ({ k: 'near', why: 'empty' }))); }}>
            <Bi k="solution" />
          </button>
        )}
        {res && (
          <>
            <span className="score-big">{revealed ? '—' : `${score} / ${rows.length}`} <Bi k="score" inline /></span>
            {cocoCtx && <AskCoco build={() => cocoCtx(vals, res)} ask={UI[score === rows.length && !revealed ? 'coco_q_table_ok' : 'coco_q_table'][1]} />}
            <button type="button" className="btn ghost" onClick={() => speak(rows.map((x) => x.say), { rate: settings.rate })}><Bi k="listen_all" /></button>
            <button type="button" ref={nextBtn} className="btn" onClick={finish}><Bi k={doneLabel} /></button>
          </>
        )}
      </div>
    </div>
  );
}
