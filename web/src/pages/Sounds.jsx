import { useState } from 'react';
import SOUNDS from '../data/sounds.json';
import { speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { Bi, Icon, Tx } from '../components/ui.jsx';
import Words from '../components/Words.jsx';
import { Dictation, PairsGame } from '../components/Listening.jsx';

const TABS = [['letters', 'snd_letters'], ['rules', 'snd_rules'], ['loans', 'snd_loans'], ['pairs', 'snd_pairs'], ['dict', 'snd_dict']];

// Pronunciation: French letters written with Turkish letters, the main rules, Turkish words that come from
// French, fine listening (minimal pairs) and dictations.
export default function Sounds() {
  const { settings } = useApp();
  const [tab, setTab] = useState('letters');
  const [open, setOpen] = useState({});
  const [dmode, setDmode] = useState('sentences');
  return (
    <div className="page sounds">
      <button type="button" className="link back" onClick={() => history.back()}><Icon name="back" size={18} /> <Bi k="nav_words" inline /></button>
      <h1><Bi k="snd_title" /></h1>
      <div className="tabs-row" role="tablist">
        {TABS.map(([id, k]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ttab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}><Bi k={k} inline /></button>)}
      </div>

      {tab === 'letters' && (
        <>
          <p className="small"><Bi k="snd_letters_intro" /></p>
          <div className="conj-wrap">
            <table className="sndt">
              <tbody>
                {SOUNDS.letters.map((l) => (
                  <tr key={l.fr}>
                    <td className="fl" lang="fr">{l.fr}</td>
                    <td className="tl">{l.tk}</td>
                    <td>
                      <div className="snd-ex">{l.ex.map((w) => <button key={w} type="button" className="exw" lang="fr" onClick={() => speak(w, { rate: settings.rate })}>{w}</button>)}</div>
                      {l.loan[0] && <div className="small muted"><span lang="tr">{l.loan[0]}</span> ← <span lang="fr">{l.loan[1]}</span></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'rules' && (
        <div className="snd-rules">
          {SOUNDS.rules.map((r, k) => (
            <div key={k} className="snd-rule">
              <p><Tx v={[r.fr, r.tr]} /></p>
              <p className="snd-rule-ex"><Words text={r.ex} /></p>
            </div>
          ))}
        </div>
      )}

      {tab === 'loans' && (
        <>
          <p className="small"><Bi k="snd_loans_intro" /></p>
          <div className="loan">
            {SOUNDS.loans.map(([tr, fr, note], k) => (
              <button key={tr} type="button" className={`lc${open[k] ? ' open' : ''}`} onClick={() => { setOpen((o) => ({ ...o, [k]: true })); speak(fr, { rate: settings.rate }); }}>
                <span className="a" lang="tr">{tr}</span>
                {open[k] && <span className="b" lang="fr">{fr}</span>}
                {open[k] && note && <span className="x" lang="tr">{note}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'pairs' && <><p className="small"><Bi k="snd_pairs_intro" /></p><PairsGame /></>}

      {tab === 'dict' && (
        <>
          <div className="seg" role="group" aria-label="Dictée / Dikte">
            <button type="button" aria-pressed={dmode === 'sentences'} onClick={() => setDmode('sentences')}><Bi k="dict_sentences" inline /></button>
            <button type="button" aria-pressed={dmode === 'words'} onClick={() => setDmode('words')}><Bi k="dict_words" inline /></button>
          </div>
          <Dictation key={dmode} mode={dmode} />
        </>
      )}
    </div>
  );
}
