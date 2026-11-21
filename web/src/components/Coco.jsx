import { Fragment, useEffect, useRef, useState } from 'react';
import { chatStream, systemPrompt } from '../lib/coco.js';
import { getKV, setKV } from '../lib/db.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { Bi } from './ui.jsx';
import Words from './Words.jsx';

export function CocoAvatar({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="34" r="26" fill="#fff" stroke="#19234d" strokeWidth="3" />
      <path d="M20 12c2-6 8-6 9 0 2-7 9-7 10 0 3-5 9-3 8 3-1 4-4 6-6 7H22c-3-2-4-6-2-10z" fill="#d23c3c" stroke="#19234d" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="24" cy="33" r="3.6" fill="#19234d" /><circle cx="25.2" cy="31.8" r="1.1" fill="#fff" />
      <circle cx="40" cy="33" r="3.6" fill="#19234d" /><circle cx="41.2" cy="31.8" r="1.1" fill="#fff" />
      <path d="M27 40l5-3 5 3-5 6z" fill="#f2ad1f" stroke="#19234d" strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 46c-1 4 1 7 4 7s4-4 1-7" fill="#d23c3c" stroke="#19234d" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// Coco's text: paragraphs, "- " lists, **bold**; French between « » can be tapped.
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|«[^»]*»)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**')) return <b key={i}><Inline text={p.slice(2, -2)} /></b>;
    if (p.startsWith('«')) return <span key={i} className="fr-q">« <Words text={p.slice(1, -1).trim()} /> »</span>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
function Rich({ text }) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((b, i) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*([-*•]|\d+\.)\s/.test(l))) {
      return <ul key={i}>{lines.map((l, k) => <li key={k}><Inline text={l.replace(/^\s*([-*•]|\d+\.)\s/, '')} /></li>)}</ul>;
    }
    return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}<Inline text={l} /></Fragment>)}</p>;
  });
}
const frenchParts = (t) => [...t.matchAll(/«([^»]*)»/g)].map((m) => m[1].trim()).filter(Boolean);

// Side panel (computer only). ask: a first question sent at once; ctx: the exercise on screen.
export default function CocoPanel({ ask, ctx, onClose }) {
  const { settings, coco } = useApp();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctrl = useRef(null);
  const end = useRef(null);
  const sent = useRef(false);

  useEffect(() => { if (!ask) getKV('coco-chat', []).then((m) => setMsgs(m || [])); }, [ask]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);
  const close = () => { ctrl.current?.abort(); onClose(); };

  const send = async (question, history = msgs, context = ctx) => {
    const q = question.trim();
    if (!q || busy) return;
    setErr(''); setText(''); setBusy(true);
    const base = [...history, { role: 'user', content: q }];
    setMsgs([...base, { role: 'assistant', content: '' }]);
    ctrl.current = new AbortController();
    const sys = [{ role: 'system', content: systemPrompt(settings.name) }];
    if (context) sys.push({ role: 'system', content: `Contexte (exercice à l'écran) :\n${context}` });
    try {
      const full = await chatStream({ model: coco.model, messages: [...sys, ...base.slice(-16)], signal: ctrl.current.signal,
        onToken: (t) => setMsgs([...base, { role: 'assistant', content: t }]) });
      const done = [...base, { role: 'assistant', content: full }];
      setMsgs(done);
      setKV('coco-chat', done.slice(-40));
    } catch (e) {
      if (e.name !== 'AbortError') setErr(String(e.message || e));
      setMsgs(base);
    }
    setBusy(false);
  };
  useEffect(() => { if (ask && !sent.current) { sent.current = true; send(ask, []); } }, [ask]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="coco" aria-label="Coco">
      <div className="coco-head">
        <CocoAvatar size={34} />
        <div className="coco-title"><b>Coco</b><span className="small muted">{coco.model}</span></div>
        <button type="button" className="btn ghost small" onClick={() => { ctrl.current?.abort(); setMsgs([]); setKV('coco-chat', []); }}><Bi k="coco_new" inline /></button>
        <button type="button" className="icon-btn" onClick={close} aria-label="Fermer / Kapat">✕</button>
      </div>
      <div className="coco-msgs">
        {!msgs.length && <p className="muted small"><Bi k="coco_hello" /></p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? (m.content ? <Rich text={m.content} /> : <span className="muted">…</span>) : <p>{m.content}</p>}
            {m.role === 'assistant' && m.content && frenchParts(m.content).length > 0 && !busy && (
              <button type="button" className="link small" onClick={() => speak(frenchParts(m.content), { rate: settings.rate })}><Bi k="coco_listen_fr" inline /></button>
            )}
          </div>
        ))}
        {err && <p className="small c-bad">{err}</p>}
        <div ref={end} />
      </div>
      <form className="coco-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <textarea className="field" rows={2} value={text} placeholder="Coco'ya sor… / Demande à Coco…" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        {busy ? <button type="button" className="btn ghost" onClick={() => ctrl.current?.abort()}><Bi k="coco_stop" inline /></button>
          : <button type="submit" className="btn"><Bi k="coco_send" inline /></button>}
      </form>
    </aside>
  );
}

// "Ask Coco" button for an exercise (shown only when Coco is ready on this computer).
export function AskCoco({ build, ask }) {
  const { coco, openCoco } = useApp();
  if (!coco.ready) return null;
  return (
    <button type="button" className="btn ghost small ask-coco" onClick={() => openCoco({ ctx: build(), ask })}>
      <CocoAvatar size={20} /> <Bi k="coco_ask" inline />
    </button>
  );
}
