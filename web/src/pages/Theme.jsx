import { useState } from 'react';
import { THEME_BY_ID, WORDS, isNoun, label, wordCardId } from '../lib/vocab.js';
import { isDue, level } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi, Icon, Pron, SpeakBtn } from '../components/ui.jsx';
import { GenderGame, ListenGame, MatchGame } from '../components/Games.jsx';
import { WordLabel } from '../components/WordCard.jsx';

export default function Theme({ id }) {
  const { cards, go } = useApp();
  const t = THEME_BY_ID.get(id);
  const [game, setGame] = useState(null);
  if (!t) return null;
  const words = t.words.map((fr) => WORDS[fr]).filter(Boolean);
  const fresh = words.filter((w) => !cards.has(wordCardId(w.fr)));
  const due = words.filter((w) => cards.has(wordCardId(w.fr)) && isDue(cards.get(wordCardId(w.fr))));
  const nouns = words.filter((w) => (w.t === 'm' || w.t === 'f') && !/^[A-ZÉ]/.test(w.fr));
  const known = words.filter((w) => cards.has(wordCardId(w.fr)));
  const playWith = known.length >= 6 ? known : words;
  return (
    <div className="page theme">
      <button type="button" className="link back" onClick={() => history.back()}><Icon name="back" size={18} /> <Bi k="nav_words" inline /></button>
      <h1><Bi pair={[t.fr, t.tr]} /></h1>
      <div className="word-modes">
        {fresh.length > 0 ? (
          <button type="button" className="btn primary" onClick={() => go('session', { items: fresh.slice(0, 8).map((w) => wordCardId(w.fr)) })}>
            <Bi k="learn_words" /><span className="btn-meta">{Math.min(8, fresh.length)} / {fresh.length}</span>
          </button>
        ) : <p className="small muted"><Bi k="done_all_new" /></p>}
        {due.length > 0 && <button type="button" className="btn ghost" onClick={() => go('session', { items: due.map((w) => wordCardId(w.fr)) })}><Bi k="review_words" /><span className="btn-meta">{due.length}</span></button>}
      </div>
      <div className="seg games-seg" role="group" aria-label="Jeux / Oyunlar">
        {nouns.length >= 4 && <button type="button" aria-pressed={game === 'gender'} onClick={() => setGame(game === 'gender' ? null : 'gender')}><Bi k="game_gender" inline /></button>}
        <button type="button" aria-pressed={game === 'match'} onClick={() => setGame(game === 'match' ? null : 'match')}><Bi k="game_match" inline /></button>
        <button type="button" aria-pressed={game === 'listen'} onClick={() => setGame(game === 'listen' ? null : 'listen')}><Bi k="game_listen" inline /></button>
      </div>
      {game === 'gender' && <GenderGame key="g" words={nouns} />}
      {game === 'match' && <MatchGame key="m" words={playWith} />}
      {game === 'listen' && <ListenGame key="l" words={playWith} />}
      <ul className="wlist">
        {words.map((w) => (
          <li key={w.fr} className="wrow">
            <span className={`dot l${level(cards.get(wordCardId(w.fr)))}`} aria-hidden="true" />
            <span className="wrow-main">
              <WordLabel w={w} />
              <span className="wrow-tr" lang="tr">{w.tr}</span>
            </span>
            <span className="wrow-pron"><Pron phon={w.ph} /></span>
            <SpeakBtn text={isNoun(w) ? label(w).replace(' / ', ', ') : w.fem ? `${w.fr}, ${w.fem}` : w.fr} />
          </li>
        ))}
      </ul>
    </div>
  );
}
