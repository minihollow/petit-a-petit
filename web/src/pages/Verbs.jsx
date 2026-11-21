import { useMemo, useState } from 'react';
import { strip, TENSE_ORDER, tenseApplies } from '../lib/conj.js';
import { cardId } from '../lib/plan.js';
import { level } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi, tx } from '../components/ui.jsx';
import { Sprint, WhichTense } from '../components/ConjGames.jsx';

export default function Verbs() {
  const { verbs, cards, go, settings } = useApp();
  const [q, setQ] = useState('');
  const [game, setGame] = useState(null);
  const list = useMemo(() => {
    const k = strip(q.trim().toLowerCase());
    if (!k) return verbs;
    return verbs.filter((v) => strip(v.inf).includes(k) || strip(v.tr.toLocaleLowerCase('tr')).includes(k));
  }, [q, verbs]);
  return (
    <div className="page verbs">
      <div className="seg games-seg" role="group" aria-label="Jeux / Oyunlar">
        <button type="button" aria-pressed={game === 'sprint'} onClick={() => setGame(game === 'sprint' ? null : 'sprint')}><Bi k="sprint" inline /></button>
        <button type="button" aria-pressed={game === 'which'} onClick={() => setGame(game === 'which' ? null : 'which')}><Bi k="which_tense" inline /></button>
      </div>
      {game === 'sprint' && <Sprint />}
      {game === 'which' && <WhichTense />}
      <input className="field search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={settings.help ? tx('search').join(' · ') : tx('search')[0]} aria-label="Chercher / Ara" />
      <p className="muted small">{verbs.length} <Bi k="verbs_count" inline /></p>
      <ul className="vlist">
        {list.map((v) => (
          <li key={v.inf}>
            <button type="button" className="vrow" onClick={() => go('verb', { inf: v.inf })}>
              <span className="vrow-main">
                <span className="vinf" lang="fr">{v.pron ? (/^[aeiouyhéèê]/i.test(v.inf) ? "s'" : 'se ') : ''}{v.inf}</span>
                <span className="vtr" lang="tr">{v.tr}</span>
              </span>
              <span className="dots" aria-hidden="true">
                {TENSE_ORDER.filter((t) => tenseApplies(v, t)).map((t) => <span key={t} className={`dot l${level(cards.get(cardId(v.inf, t)))}`} />)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
