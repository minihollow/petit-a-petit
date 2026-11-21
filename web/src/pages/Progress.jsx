import { LESSON_BY_ID, LESSON_KIND, UNITS, isWritten, myTexts, unitProgress } from '../lib/course.js';
import { dayKey, streak } from '../lib/plan.js';
import { isKnown } from '../lib/srs.js';
import { useApp } from '../store.js';
import SyncLine from '../components/SyncLine.jsx';
import { Bi, Meter, useMode } from '../components/ui.jsx';

const WEEKS = 16;

// Progress: key figures, the study calendar, the units and the texts she wrote.
export default function Progress() {
  const { settings, days, cards, done, events } = useApp();
  const mode = useMode();
  const today = new Date();
  const minToday = Math.round((days[dayKey(today)]?.ms || 0) / 60000);
  let minWeek = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(today); d.setDate(d.getDate() - i); minWeek += (days[dayKey(d)]?.ms || 0) / 60000; }
  let words = 0; let tables = 0;
  for (const c of cards.values()) { if (!isKnown(c)) continue; if (c.id.startsWith('word:')) words++; else if (c.id.startsWith('conj:')) tables++; }
  const lessons = [...LESSON_BY_ID.keys()];
  const kpis = [
    [streak(days), streak(days) === 1 ? 'streak_1' : 'kpi_streak'], [minToday, 'kpi_today'], [Math.round(minWeek), 'kpi_week'],
    [`${lessons.filter((id) => done.has(id)).length}/${lessons.length}`, 'kpi_lessons'], [words, 'kpi_words'], [tables, 'kpi_tables'],
  ];

  // Calendar: WEEKS columns of 7 days, ending this week; colour by minutes against the daily goal.
  const end = new Date(today); end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  const cells = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const m = (days[dayKey(d)]?.ms || 0) / 60000;
    const lvl = d > today ? 'future' : m >= settings.goal ? 'l3' : m >= settings.goal / 2 ? 'l2' : m > 0 ? 'l1' : '';
    cells.push(<span key={i} className={`${lvl}${dayKey(d) === dayKey(today) ? ' today' : ''}`} title={`${d.toLocaleDateString(mode === 'tr' ? 'tr-TR' : 'fr-FR')} · ${Math.round(m)} min`} />);
  }
  const texts = myTexts(events);

  return (
    <div className="page progress">
      <div className="hello"><div><h1><Bi k="nav_progress" dual /></h1></div><SyncLine /></div>
      <div className="kpis">
        {kpis.map(([v, k]) => <div key={k} className="kpi"><b>{v}</b><span className="muted small"><Bi k={k} /></span></div>)}
      </div>
      <section className="panel">
        <div className="panel-head"><h2><Bi k="calendar" /></h2></div>
        <div className="cal">{cells}</div>
        <div className="cal-legend"><Bi k="cal_less" /> <span className="sq l1" /><span className="sq l2" /><span className="sq l3" /> <Bi k="cal_more" /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2><Bi k="my_path" /></h2></div>
        <div className="unit-bars">
          {UNITS.filter(isWritten).map((u) => {
            const p = unitProgress(u, done);
            return <div key={u.id} className="unit-bar"><span>{u.n}. <Bi pair={[u.fr, u.tr]} /></span><Meter value={p.n} max={p.total} /><span className="small muted">{p.n}/{p.total}</span></div>;
          })}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2><Bi k="my_texts" /></h2></div>
        {texts.length ? (
          <ul className="texts">
            {texts.map((e) => {
              const l = LESSON_BY_ID.get(e.lesson);
              return (
                <li key={e.id}>
                  <p className="small muted">{new Date(e.ts).toLocaleDateString(mode === 'tr' ? 'tr-TR' : 'fr-FR', { day: 'numeric', month: 'long' })}
                    {l && <> · <Bi pair={[`Unité ${l.unit.n}`, `Ünite ${l.unit.n}`]} /> · <Bi k={LESSON_KIND[l.type].k} /></>}</p>
                  <p className="text-body" lang="fr">{e.text}</p>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted"><Bi k="no_texts" /></p>}
      </section>
    </div>
  );
}
