import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { UI } from '../i18n.js';
import { useApp } from '../store.js';
import { speak } from '../lib/tts.js';
import { toIPA, toTK } from '../lib/phon.js';

export const tx = (k, n) => (UI[k] || [String(k), '']).map((s) => s.replace('{n}', n));

// Help language mode, as in Passeport civique:
// 'tr' = interface and explanations in Turkish, French examples with their translation;
// 'bi' = French, Turkish on demand (TR buttons, tap an explanation); 'fr' = French only.
export const MODES = ['tr', 'bi', 'fr'];
export function useMode() {
  const { settings } = useApp();
  return MODES.includes(settings.mode) ? settings.mode : 'bi';
}

// Interface label [fr, tr]: Turkish in 'tr' mode, French otherwise.
// dual: French with the Turkish in small print in 'bi' mode (menu, page titles).
// tip: an instruction; in 'bi' mode a small TR button shows the Turkish (not inside a button).
export function Bi({ k, pair, n, inline = false, dual = false, tip = false }) {
  const mode = useMode();
  const [open, setOpen] = useState(false);
  const [fr, tr] = pair || (n !== undefined ? tx(k, n) : UI[k] || [String(k), '']);
  if (mode === 'tr' && tr) return <span className="fr-t" lang="tr">{tr}</span>;
  if (mode === 'bi' && tr && dual) return <><span className="fr-t">{fr}</span><span className={inline ? 'tr-i' : 'tr-t'} lang="tr">{tr}</span></>;
  if (mode === 'bi' && tr && tip) {
    return (
      <>
        <span className="fr-t">{fr}</span>{' '}
        <button type="button" className="tr-mini" aria-pressed={open} title="Türkçe" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>TR</button>
        {open && <span className={inline ? 'tr-i' : 'tr-t'} lang="tr">{tr}</span>}
      </>
    );
  }
  return <span className="fr-t">{fr}</span>;
}

// An explanation [fr, tr] (rule, instruction): Turkish only in 'tr' mode; in 'bi' mode, tapping the French shows the Turkish.
export function Tx({ v, block = true }) {
  const mode = useMode();
  const scope = useContext(TrCtx);
  const [open, setOpen] = useState(false);
  if (!v) return null;
  const [fr, tr] = v;
  if (mode === 'fr' || !tr) return <span lang="fr">{fr}</span>;
  if (mode === 'tr') return <span lang="tr">{tr}</span>;
  const shown = open || scope?.open;
  const toggle = (e) => { e.stopPropagation(); setOpen((o) => !o); };
  return (
    <>
      <span lang="fr" className="fr-clickable" role="button" tabIndex={0} title="Türkçe için dokun"
        onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } }}>{fr}</span>
      {shown && <span className={block ? 'tr-line' : 'tr-line inline'} lang="tr">{tr}</span>}
    </>
  );
}

// A block whose Turkish lines are shown together with one TR button ('bi' mode).
const TrCtx = createContext(null);
export function TrScope({ children, open: initial = false }) {
  const [open, setOpen] = useState(initial);
  return <TrCtx.Provider value={{ open, setOpen }}>{children}</TrCtx.Provider>;
}
export function TrBtn({ label = 'TR' }) {
  const mode = useMode();
  const s = useContext(TrCtx);
  if (mode !== 'bi' || !s) return null;
  return (
    <button type="button" className="icon-btn tr-btn" aria-pressed={s.open} title="Türkçe çeviri"
      onClick={(e) => { e.stopPropagation(); s.setOpen((o) => !o); }}>{label}</button>
  );
}
// Turkish line: always in 'tr' mode, never in 'fr' mode, in 'bi' mode when its block is open (or always).
export function TrLine({ children, inline = false, always = false }) {
  const mode = useMode();
  const s = useContext(TrCtx);
  if (!children || mode === 'fr') return null;
  if (mode === 'bi' && !always && !s?.open) return null;
  return <span className={inline ? 'tr-i' : 'tr-line'} lang="tr">{children}</span>;
}
export const useTrOpen = () => useContext(TrCtx)?.open;

const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  route: 'M6 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5',
  cards: 'M3.5 9a2.5 2.5 0 0 1 2.5-2.5h8A2.5 2.5 0 0 1 16.5 9v9a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18zM8 3.5h10A2.5 2.5 0 0 1 20.5 6v11',
  library: 'M3.5 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8.5-.5V19c-2.5-1-5.5-1-8.5.5-3-1.5-6-1.5-8.5-.5zM12 6v13.5',
  chart: 'M5 20V11M11 20V5M17 20v-7M3 20h18',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4L10.6 6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4z',
  flame: 'M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.8 2.5-5 .3 1.6 1.2 2.6 2 3 0-3 .3-5.4.5-8z',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M6 11h12v9.5H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  play: 'M8 5.5v13l10.5-6.5z',
  book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z',
  rule: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  table: 'M3.5 5.5h17v13h-17zM3.5 10h17M9.5 10v8.5',
  ear: 'M4 15v-3a8 8 0 0 1 16 0v3M3 14h4.5v6.5H5A2 2 0 0 1 3 18.5zM21 14h-4.5v6.5H19a2 2 0 0 0 2-2z',
  pen: 'M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  sound: 'M4 10v4M8 7v10M12 4v16M16 8v8M20 10.5v3',
  list: 'M4 6h16M4 12h16M4 18h10',
  spark: 'M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z',
};
const FILLED = new Set(['home', 'flame', 'play']);
export function Icon({ name, size = 22 }) {
  const filled = FILLED.has(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d={ICONS[name] || ICONS.list} fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={name === 'gear' ? 1.6 : 2} strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd" />
    </svg>
  );
}

// Drawn flags (Windows does not show flag emojis).
export function Flag({ c, h = 14 }) {
  const w = Math.round(h * 1.5);
  const id = useId().replace(/:/g, '');
  if (c === 'fr') {
    return (
      <svg width={w} height={h} viewBox="0 0 3 2" aria-hidden="true" className="flag">
        <rect width="1" height="2" fill="#002395" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  }
  const star = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.5 : 1.25;
    const a = (Math.PI / 5) * i;
    return `${(16.6 + r * Math.cos(a)).toFixed(2)},${(10 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox="0 0 30 20" aria-hidden="true" className="flag" data-id={id}>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="11" cy="10" r="5" fill="#fff" />
      <circle cx="12.25" cy="10" r="4" fill="#E30A17" />
      <polygon points={star} fill="#fff" />
    </svg>
  );
}
export function ModeFlag({ mode, h = 14 }) {
  if (mode === 'bi') return <span className="flags"><Flag c="fr" h={h} /><Flag c="tr" h={h} /></span>;
  return <Flag c={mode === 'fr' ? 'fr' : 'tr'} h={h} />;
}

export function SpeakBtn({ text, label = 'Écouter' }) {
  const { settings } = useApp();
  if (!text) return null;
  return (
    <button type="button" className="icon-btn spk" aria-label={`${label} : ${Array.isArray(text) ? text.join(', ') : text}`}
      onClick={(e) => { e.stopPropagation(); speak(text, { rate: settings.rate }); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 0 1 0 7M18.6 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  );
}

// Coloured form: radical, pronounced ending, silent letters, auxiliary, agreement, reflexive pronoun.
export function Parts({ parts }) {
  return <span className="parts" lang="fr">{parts.map(([t, k], i) => <span key={i} className={`p-${k}`}>{t}</span>)}</span>;
}

export function Pron({ phon }) {
  const { settings } = useApp();
  if (!phon) return null;
  const tk = <span className="tk">{toTK(phon)}</span>;
  const ipa = <span className="ipa">[{toIPA(phon)}]</span>;
  if (settings.pron === 'ipa') return ipa;
  if (settings.pron === 'both') return <>{tk} {ipa}</>;
  return tk;
}

// Accented letters (Turkish keyboards lack them): inserted into the last focused French field.
const ACC = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ', "'"];
let lastField = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => { if (e.target?.matches?.('input[data-fr], textarea[data-fr]')) lastField = e.target; });
}
export function AccentBar() {
  return (
    <div className="accents" role="group" aria-label="Lettres accentuées / Aksanlı harfler"
      onPointerDown={(e) => { if (e.target.closest('button')) e.preventDefault(); }}>
      {ACC.map((a) => (
        <button key={a} type="button" onClick={() => {
          const f = lastField;
          if (!f || !document.body.contains(f) || f.disabled) return;
          const s = f.selectionStart ?? f.value.length;
          const en = f.selectionEnd ?? s;
          const v = f.value.slice(0, s) + a + f.value.slice(en);
          const proto = f.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, v); // let React see the change
          f.dispatchEvent(new Event('input', { bubbles: true }));
          f.focus();
          try { f.setSelectionRange(s + a.length, s + a.length); } catch { /* ignore */ }
        }}>{a}</button>
      ))}
    </div>
  );
}

export function Ring({ value, max, size = 64, children }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="ring-in">{children}</span>
    </div>
  );
}

export function Meter({ value, max = 1 }) {
  const pct = Math.round(Math.max(0, Math.min(1, max ? value / max : 0)) * 100);
  return <div className="meter" role="img" aria-label={`${pct} %`}><span style={{ width: `${pct}%` }} /></div>;
}

// The page scrolls inside .content (side menu layout): back to its top.
export const scrollTop = () => document.querySelector('.content')?.scrollTo({ top: 0 });

// Focus the first field when a drill opens (without scrolling the page on phones).
export function useAutoFocus(ref, deps) {
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
export const useFirstRef = () => useRef(null);
