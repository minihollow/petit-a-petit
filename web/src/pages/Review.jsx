import { useState } from 'react';
import { buildSeries } from '../lib/plan.js';
import { useApp } from '../store.js';
import Session from './Session.jsx';
import { Bi, Icon } from '../components/ui.jsx';

// Reviews: the cards due today (words, tables, rules learned in the lessons or the library).
export default function Review() {
  const { cards, go, doSync } = useApp();
  const [items] = useState(() => buildSeries(cards, [], [], { newPerDay: 0, newWords: 0, size: 30 }));
  if (!items.length) {
    return (
      <div className="page review">
        <div className="empty panel">
          <span className="done-ico"><Icon name="check" size={30} /></span>
          <h1><Bi k="review_none_title" /></h1>
          <p className="muted"><Bi k="review_none" /></p>
          <button type="button" className="btn primary" onClick={() => go('home')}><Bi k="go_path" /></button>
        </div>
      </div>
    );
  }
  return <Session items={items} onEnd={(did) => { if (did) doSync(); go('home'); }} />;
}
