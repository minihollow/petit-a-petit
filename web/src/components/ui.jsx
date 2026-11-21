import { useEffect, useRef } from 'react';
import { UI } from '../i18n.js';
import { useApp } from '../store.js';
import { speak } from '../lib/tts.js';
import { toIPA, toTK } from '../lib/phon.js';

export const tx = (k, n) => (UI[k] || [String(k), '']).map((s) => s.replace('{n}', n));

// French text with the Turkish help under it (or after it with inline).
export function Bi({ k, pair, n, inline = false }) {
  const { settings } = useApp();
  const [fr, tr] = pair || (n !== undefined ? tx(k, n) : UI[k] || [String(k), '']);
  return (
    <>
      <span className="fr-t">{fr}</span>
      {settings.help && tr && <span className={inline ? 'tr-i' : 'tr-t'} lang="tr">{tr}</span>}
    </>
  );
}

const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  list: 'M4 6h16M4 12h16M4 18h10',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4L10.6 6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4z',
  flame: 'M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.8 2.5-5 .3 1.6 1.2 2.6 2 3 0-3 .3-5.4.5-8z',
  back: 'M15 5l-7 7 7 7',
  book: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z',
  rule: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
};
export function Icon({ name, size = 22 }) {
  const stroke = name === 'list' || name === 'back' || name === 'book' || name === 'rule';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d={ICONS[name]} fill={stroke ? 'none' : 'currentColor'} stroke={stroke || name === 'gear' ? 'currentColor' : 'none'}
        strokeWidth={stroke ? 2.2 : name === 'gear' ? 1.4 : 0} strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd" />
    </svg>
  );
}

export function SpeakBtn({ text, label = 'Écouter' }) {
  const { settings } = useApp();
  if (!text) return null;
  return (
    <button type="button" className="spk" aria-label={`${label} : ${Array.isArray(text) ? text.join(', ') : text}`}
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
  document.addEventListener('focusin', (e) => { if (e.target?.matches?.('input[data-fr]')) lastField = e.target; });
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
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(f, v); // let React see the change
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tint2)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--red)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="ring-in">{children}</span>
    </div>
  );
}

// Focus the first field when a drill opens (without scrolling the page on phones).
export function useAutoFocus(ref, deps) {
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
export const useFirstRef = () => useRef(null);
