import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { catLabel, lookupWord, tokenize } from '../lib/lexicon.js';
import { WORDS, wordCardId } from '../lib/vocab.js';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { Bi, Pron, SpeakBtn } from './ui.jsx';

// French text where each word can be tapped: it is read aloud and explained in a sheet at the bottom
// (meaning in Turkish, kind of word, gender, pronunciation, link to its conjugation or its card).
export default function Words({ text, className = '' }) {
  const { settings } = useApp();
  const [open, setOpen] = useState(null); // { word, i }
  if (!text) return null;
  const tokens = tokenize(text);
  return (
    <>
      <span className={`words ${className}`} lang="fr">
        {tokens.map((t, i) => (t.word ? (
          <span key={i} role="button" tabIndex={0} className={`w${open?.i === i ? ' on' : ''}`}
            onClick={(e) => { e.stopPropagation(); speak(t.text, { rate: settings.rate }); setOpen({ word: t.text, i }); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speak(t.text, { rate: settings.rate }); setOpen({ word: t.text, i }); } }}>
            {t.text}
          </span>
        ) : <span key={i}>{t.text}</span>))}
      </span>
      {open && createPortal(<WordSheet word={open.word} onClose={() => setOpen(null)} />, document.body)}
    </>
  );
}

function WordSheet({ word, onClose }) {
  const { go, byInf, cards } = useApp();
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    lookupWord(word).then((e) => live && setEntries(e)).catch(() => live && setFailed(true));
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { live = false; document.removeEventListener('keydown', onKey); };
  }, [word, onClose]);
  const main = entries?.[0];
  const verb = entries?.find((x) => x.cat === 'v' && byInf.has(x.lemma));
  const card = entries?.map((x) => WORDS[x.lemma]).find(Boolean);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={word} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-word" lang="fr">{word}</span>
          <SpeakBtn text={word} />
          <button type="button" className="icon-btn sheet-x" onClick={onClose} aria-label="Fermer / Kapat">✕</button>
        </div>
        {!entries && !failed && <p className="muted"><Bi k="loading" inline /></p>}
        {failed && <p className="muted"><Bi k="unknown_word" inline /></p>}
        {entries && !entries.length && <p className="muted"><Bi k="unknown_word" inline /></p>}
        {entries?.slice(0, 3).map((x, k) => (
          <div key={k} className={`sheet-entry${k ? ' minor' : ''}`}>
            {x.tr && <div className="sheet-tr" lang="tr">{x.tr}</div>}
            <div className="sheet-meta">
              <span>{catLabel(x.cat)[0]} · <span className="tr-i-plain" lang="tr">{catLabel(x.cat)[1]}</span></span>
              {x.g && (x.cat === 'n' || x.cat === 'a') && <span className={`gpill ${x.g}`}>{x.g === 'm' ? 'masc. · eril' : 'fém. · dişil'}</span>}
              {x.lemma !== word.toLowerCase() && <span>← <b lang="fr">{x.lemma}</b></span>}
              {x.ph && <Pron phon={x.ph} />}
            </div>
          </div>
        ))}
        {main && (
          <div className="row sheet-actions">
            {verb && <button type="button" className="btn small" onClick={() => { onClose(); go('verb', { inf: verb.lemma }); }}><Bi k="see_conj" inline /></button>}
            {card && !cards.has(wordCardId(card.fr)) && <button type="button" className="btn small ghost" onClick={() => { onClose(); go('session', { items: [wordCardId(card.fr)] }); }}><Bi k="learn_this" inline /></button>}
          </div>
        )}
      </div>
    </div>
  );
}
