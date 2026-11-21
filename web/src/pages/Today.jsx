import { useMemo } from 'react';
import { TENSE_ORDER, TENSES } from '../lib/conj.js';
import { buildSeries, counts, dayKey, parseCard, streak } from '../lib/plan.js';
import { isKnown } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi, Icon, Ring } from '../components/ui.jsx';
import SyncLine from '../components/SyncLine.jsx';

export default function Today() {
  const { settings, cards, course, days, go } = useApp();
  const series = useMemo(() => buildSeries(cards, course, { newPerDay: settings.newPerDay }), [cards, course, settings.newPerDay]);
  const c = counts(cards, course, settings.newPerDay);
  const minutes = Math.round((days[dayKey(Date.now())]?.ms || 0) / 60000);
  const st = streak(days);
  const doneToday = !!days[dayKey(Date.now())];

  // Known tables per tense (course order).
  const perTense = TENSE_ORDER.map((t) => {
    let known = 0; let started = 0;
    for (const card of cards.values()) { if (parseCard(card.id)?.tense !== t) continue; started++; if (isKnown(card)) known++; }
    return { t, known, started };
  }).filter((x) => x.started > 0);
  const known = perTense.reduce((a, x) => a + x.known, 0);
  const started = perTense.reduce((a, x) => a + x.started, 0);

  return (
    <div className="page today">
      <h1 className="hello"><Bi pair={[`Bonjour${settings.name ? `, ${settings.name}` : ''} !`, `Merhaba${settings.name ? ` ${settings.name}` : ''}!`]} /></h1>

      <section className="day-card">
        <Ring value={minutes} max={settings.goal} size={78}><b>{minutes}</b><small>/{settings.goal}</small></Ring>
        <div className="day-stats">
          <div><b>{minutes}</b> <Bi k="minutes_today" inline /> · <Bi k="goal" inline /> {settings.goal}</div>
          <div className="streak"><Icon name="flame" size={18} /> <b>{st}</b> <Bi k="streak" inline /></div>
          <div className="muted small"><b>{c.due}</b> <Bi k="due" inline /> · <b>{c.fresh}</b> <Bi k="fresh" inline /></div>
        </div>
      </section>

      {series.length > 0 ? (
        <button type="button" className="btn big" onClick={() => go('session', { items: series })}>
          <Bi k={doneToday ? 'another_series' : 'start_series'} />
          <span className="btn-meta">{series.length} <Bi k="series_size" inline /></span>
        </button>
      ) : (
        <div className="note"><Bi k="all_done" /><div className="small"><Bi k="extra_hint" /></div></div>
      )}

      {started > 0 && (
        <section className="block">
          <h2><Bi k="progress" /></h2>
          <p className="small"><b>{known}</b> <Bi k="known_tables" inline /> · <b>{started}</b> <Bi k="started_tables" inline /></p>
          <ul className="bars">
            {perTense.map((x) => (
              <li key={x.t}>
                <span className="bar-l" lang="fr">{TENSES[x.t].fr}</span>
                <span className="bar"><span style={{ width: `${Math.round((x.known / Math.max(1, x.started)) * 100)}%` }} /></span>
                <span className="bar-n">{x.known}/{x.started}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="block soon">
        <h2><Bi k="coming" /></h2>
        <p className="small"><Bi k="coming_list" /></p>
      </section>

      <SyncLine />
    </div>
  );
}
