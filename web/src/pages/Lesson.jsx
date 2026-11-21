import { useEffect, useMemo, useRef, useState } from 'react';
import { LESSON_BY_ID, LESSON_KIND, bilanItems, lessonAfter, lessonItems, lessonSubtitle } from '../lib/course.js';
import { CHAPTER_BY_ID, gramCardId } from '../lib/grammar.js';
import { taskContext } from '../lib/coco.js';
import { speak, stopSpeaking } from '../lib/tts.js';
import { UI } from '../i18n.js';
import { useApp } from '../store.js';
import Session from './Session.jsx';
import { ChapterBody } from './Chapter.jsx';
import Words from '../components/Words.jsx';
import { AskCoco } from '../components/Coco.jsx';
import { AccentBar, Bi, Icon, SpeakBtn, TrBtn, TrLine, TrScope, scrollTop, tx, useMode } from '../components/ui.jsx';

const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const total = (log) => ({ ok: log.reduce((a, x) => a + (x.ok || 0), 0), n: log.reduce((a, x) => a + (x.n || 0), 0), ms: 0 });

// One lesson of the course, whatever its kind; at the end a 'lesson' event marks it done.
export default function Lesson({ id }) {
  const { go, logLesson } = useApp();
  const L = LESSON_BY_ID.get(id);
  const [result, setResult] = useState(null);
  if (!L) return null;
  const K = LESSON_KIND[L.type];
  const toUnit = () => go('unit', { id: L.unit.id });
  const finish = async (res = {}) => { await logLesson(L.id, res); setResult(res); scrollTop(); };
  if (result) return <LessonDone L={L} result={result} />;

  let body = null;
  if (L.type === 'words' || L.type === 'verbs') body = <Session items={lessonItems(L)} onEnd={toUnit} onFinish={(log) => finish(total(log))} />;
  else if (L.type === 'bilan') body = <Bilan L={L} onEnd={toUnit} onFinish={(log) => finish(total(log))} />;
  else if (L.type === 'rule') body = <RuleLesson L={L} onEnd={toUnit} onFinish={(log) => finish(total(log))} />;
  else if (L.type === 'listen') body = <ListenLesson L={L} onFinish={finish} />;
  else if (L.type === 'task') body = <TaskLesson L={L} onFinish={finish} />;

  return (
    <div className="page lesson">
      <button type="button" className="link back" onClick={toUnit}>
        <Icon name="back" size={18} /> <Bi pair={[`Unité ${L.unit.n} · ${L.unit.fr}`, `Ünite ${L.unit.n} · ${L.unit.tr}`]} />
      </button>
      <header className="lesson-head">
        <span className="kicker"><Bi pair={tx('lesson_n', L.idx + 1)} /> · {K.min} min</span>
        <h1><Bi k={K.k} /></h1>
        {L.type !== 'task' && <p className="muted"><Bi pair={lessonSubtitle(L)} /></p>}
      </header>
      {body}
    </div>
  );
}

function Bilan({ L, onEnd, onFinish }) {
  const [items] = useState(() => bilanItems(L.unit));
  return <Session items={items} onEnd={onEnd} onFinish={onFinish} />;
}

// The rule card first, then its exercises.
function RuleLesson({ L, onEnd, onFinish }) {
  const [step, setStep] = useState('read');
  const ch = CHAPTER_BY_ID.get(L.chapter);
  if (!ch) return null;
  if (step === 'read') {
    return (
      <>
        <ChapterBody ch={ch} />
        <button type="button" className="btn primary big" onClick={() => { setStep('ex'); scrollTop(); }}>
          <Bi k="do_exercises" /><span className="btn-meta">{ch.ex.length} <Bi k="exercises_n" inline /></span>
        </button>
      </>
    );
  }
  return <Session items={[gramCardId(L.chapter)]} onEnd={onEnd} onFinish={onFinish} />;
}

// Listening: the dialogue is heard first without the text, then the questions; the text (with translation) comes after.
function ListenLesson({ L, onFinish }) {
  const { settings } = useApp();
  const [playing, setPlaying] = useState(-1);
  const [showText, setShowText] = useState(false);
  const [answers, setAnswers] = useState({});
  const stopped = useRef(false);
  const start = useRef(Date.now());
  const qs = useMemo(() => L.questions.map((q) => ({ ...q, order: shuffle(q.o.map((_, i) => i)) })), [L]);
  useEffect(() => () => { stopped.current = true; stopSpeaking(); }, []);
  const playAll = async () => {
    if (playing >= 0) { stopped.current = true; stopSpeaking(); setPlaying(-1); return; }
    stopped.current = false;
    for (let i = 0; i < L.lines.length; i++) {
      if (stopped.current) break;
      setPlaying(i);
      await speak(L.lines[i][1], { rate: settings.rate });
      await new Promise((r) => setTimeout(r, 300));
    }
    setPlaying(-1);
  };
  const answered = Object.keys(answers).length;
  const all = answered === qs.length;
  const ok = qs.filter((q, i) => answers[i] === q.a).length;
  const name = (s) => L.who?.[s] || s;
  const textShown = showText || all;
  return (
    <div className="listen">
      <p className="muted"><Bi k="listen_intro" tip /></p>
      <section className="panel dlg">
        <div className="dlg-head">
          <h2><Bi pair={L.title} /></h2>
          <div className="row">
            <button type="button" className="btn primary" onClick={playAll}>
              <Icon name={playing >= 0 ? 'close' : 'play'} size={16} /> <Bi k={playing >= 0 ? 'stop' : 'play_all'} />
            </button>
            {!all && <button type="button" className="btn ghost" aria-pressed={showText} onClick={() => setShowText((s) => !s)}><Bi k={showText ? 'hide_text' : 'show_text'} /></button>}
          </div>
        </div>
        {textShown ? (
          <TrScope>
            <div className="dlg-tools"><TrBtn label="TR · Tout traduire" /></div>
            <ol className="dlg-lines">
              {L.lines.map(([s, fr, tr], i) => (
                <li key={i} className={`dlg-line s-${s}${playing === i ? ' playing' : ''}`}>
                  <span className="who">{name(s)}</span>
                  <span className="dlg-say"><Words text={fr} /><TrLine>{tr}</TrLine></span>
                  <SpeakBtn text={fr} />
                </li>
              ))}
            </ol>
          </TrScope>
        ) : (
          <ol className="dlg-hidden" aria-label="Dialogue">
            {L.lines.map(([s], i) => (
              <li key={i} className={`dlg-bar s-${s}${playing === i ? ' playing' : ''}`}><span className="who">{name(s)}</span><span className="wave" /></li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2><Bi k="questions" /></h2><span className="muted small">{answered} / {qs.length}</span></div>
        <ol className="quiz">
          {qs.map((q, qi) => {
            const picked = answers[qi];
            const isDone = picked !== undefined;
            return (
              <li key={qi} className="quiz-q">
                <TrScope>
                  <div className="quiz-text">
                    <p><b>{qi + 1}.</b> <span lang="fr">{q.q[0]}</span><TrLine>{q.q[1]}</TrLine></p>
                    <TrBtn />
                  </div>
                  <div className="options">
                    {q.order.map((oi) => {
                      const o = q.o[oi];
                      const [fr, tr] = Array.isArray(o) ? o : [o, ''];
                      const cls = !isDone ? '' : oi === q.a ? ' right' : picked === oi ? ' wrong' : ' dim';
                      return (
                        <button key={oi} type="button" className={`opt${cls}`} disabled={isDone} onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}>
                          <span lang="fr">{fr}</span>{tr && <TrLine>{tr}</TrLine>}
                        </button>
                      );
                    })}
                  </div>
                </TrScope>
              </li>
            );
          })}
        </ol>
      </section>

      {all && (
        <div className={`feedback ${ok >= qs.length - 1 ? 'ok' : 'ko'}`}>
          <p className="feedback-title">{ok} / {qs.length} <Bi k="score" inline /></p>
          <p><Bi k="listen_after" tip /></p>
          <button type="button" className="btn primary" onClick={() => onFinish({ ok, n: qs.length, ms: Math.min(Date.now() - start.current, 15 * 60000) })}>
            <Bi k="finish_lesson" />
          </button>
        </div>
      )}
    </div>
  );
}

// Writing: the task, useful sentences, her text (heard aloud, corrected by Coco on the computer), a checklist and a model.
function TaskLesson({ L, onFinish }) {
  const { settings } = useApp();
  const mode = useMode();
  const key = `pap-task-${L.id}`;
  const [text, setText] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  const [model, setModel] = useState(false);
  const [checks, setChecks] = useState({});
  const start = useRef(Date.now());
  useEffect(() => { try { localStorage.setItem(key, text); } catch { /* ignore */ } }, [key, text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="task">
      <section className="panel task-prompt">
        <TrScope>
          <div className="panel-head"><h2><Bi k="task_title" /></h2><TrBtn /></div>
          <p className="prompt" lang="fr">{L.prompt[0]}</p>
          <TrLine>{L.prompt[1]}</TrLine>
        </TrScope>
      </section>

      <section className="panel">
        <TrScope>
          <div className="panel-head"><h3><Bi k="useful" /></h3><TrBtn /></div>
          <ul className="hints">
            {L.hints.map(([fr, tr], i) => (
              <li key={i}><span className="hint-fr"><span lang="fr">{fr}</span><TrLine>{tr}</TrLine></span><SpeakBtn text={fr.replace(/…/g, '')} /></li>
            ))}
          </ul>
        </TrScope>
      </section>

      <section className="panel task-write">
        <label className="lab" htmlFor="task-text"><Bi k="your_text" /></label>
        <AccentBar />
        <textarea id="task-text" data-fr="" lang="fr" className="field task-area" rows={7} value={text} spellCheck={false}
          placeholder={tx('task_ph')[mode === 'tr' ? 1 : 0]} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <span className="muted small">{words} <Bi k="words_n" inline /></span>
          <span className="spacer" />
          <button type="button" className="btn ghost small" disabled={!text.trim()} onClick={() => speak(text, { rate: settings.rate })}>
            <Icon name="ear" size={16} /> <Bi k="listen_mine" />
          </button>
          {text.trim() && <AskCoco build={() => taskContext({ prompt: L.prompt[0], text, model: L.model[0] })} ask={UI.coco_q_task[1]} />}
        </div>
      </section>

      <section className="panel">
        <TrScope>
          <div className="panel-head"><h3><Bi k="check_list" /></h3><TrBtn /></div>
          <ul className="checks">
            {L.checks.map(([fr, tr], i) => (
              <li key={i}>
                <label><input type="checkbox" checked={!!checks[i]} onChange={(e) => setChecks((c) => ({ ...c, [i]: e.target.checked }))} /> <span lang="fr">{fr}</span></label>
                <TrLine>{tr}</TrLine>
              </li>
            ))}
          </ul>
        </TrScope>
      </section>

      <section className="panel model-box">
        <button type="button" className="btn ghost" aria-expanded={model} onClick={() => setModel((m) => !m)}><Bi k={model ? 'hide_model' : 'show_model'} /></button>
        {model && (
          <TrScope>
            <div className="model-text">
              <p lang="fr"><Words text={L.model[0]} /></p>
              <div className="row"><SpeakBtn text={L.model[0]} /><TrBtn /></div>
            </div>
            <TrLine>{L.model[1]}</TrLine>
          </TrScope>
        )}
      </section>

      <button type="button" className="btn primary big" disabled={!text.trim()}
        onClick={() => onFinish({ ok: 1, n: 1, ms: Math.min(Date.now() - start.current, 15 * 60000), text: text.trim() })}>
        <Bi k="task_done" />
      </button>
    </div>
  );
}

function LessonDone({ L, result }) {
  const { go, done } = useApp();
  const next = lessonAfter(L.id);
  const unitDone = L.unit.lessons.every((l) => done.has(l.id));
  return (
    <div className="page lesson-done">
      <div className="done-card">
        <span className="done-ico"><Icon name="check" size={34} /></span>
        <h1><Bi k={unitDone ? 'unit_done' : 'lesson_done'} /></h1>
        {result.n > 0 && <p className="score-line"><b>{result.ok}</b> / {result.n} <Bi k="score" inline /></p>}
        {unitDone && <p className="muted"><Bi pair={[`Unité ${L.unit.n} · ${L.unit.fr}`, `Ünite ${L.unit.n} · ${L.unit.tr}`]} /></p>}
        <div className="btn-row">
          {next && <button type="button" className="btn primary" onClick={() => go('lesson', { id: next.id })}><Bi k="next_lesson" /></button>}
          <button type="button" className="btn" onClick={() => go('unit', { id: L.unit.id })}><Bi k="back_unit" /></button>
          {!next && <button type="button" className="btn" onClick={() => go('home')}><Bi k="nav_path" /></button>}
        </div>
      </div>
    </div>
  );
}
