import { useMemo } from 'react';
import { LESSON_KIND, UNITS, isWritten, lessonSubtitle, nextLesson, unitProgress } from '../lib/course.js';
import { dayKey, streak } from '../lib/plan.js';
import { isDue } from '../lib/srs.js';
import { useApp } from '../store.js';
import { Bi, Icon, Meter, Ring, tx, useMode } from '../components/ui.jsx';

// Home: the next lesson of the course (one button), today's reviews and goal, then the 12 units.
export default function Home() {
  const { settings, cards, days, done, go } = useApp();
  const mode = useMode();
  const next = nextLesson(done);
  const due = useMemo(() => { const now = Date.now(); let n = 0; for (const c of cards.values()) if (isDue(c, now)) n++; return n; }, [cards]);
  const minutes = Math.round((days[dayKey(Date.now())]?.ms || 0) / 60000);
  const st = streak(days);
  const fresh = done.size === 0;
  const written = UNITS.filter(isWritten);
  const unitsDone = written.filter((u) => unitProgress(u, done).state === 'done').length;
  const date = new Date().toLocaleDateString(mode === 'tr' ? 'tr-TR' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page home">
      <div className="hello">
        <div>
          <h1><Bi k="hello" />{settings.name ? ` ${settings.name}` : ''}{mode === 'tr' ? '!' : ' !'}</h1>
          <p className="muted">{date}</p>
        </div>
      </div>

      {fresh && <p className="welcome"><Bi k="welcome_path" tip /></p>}

      <div className="actions">
        {next ? (
          <button type="button" className="action hero" onClick={() => go('lesson', { id: next.id })}>
            <span className="kicker"><Bi pair={[`Unité ${next.unit.n} · ${next.unit.fr}`, `Ünite ${next.unit.n} · ${next.unit.tr}`]} /></span>
            <span className="big"><Bi pair={tx('lesson_n', next.idx + 1)} /> · <Bi k={LESSON_KIND[next.type].k} /></span>
            <span className="hero-sub"><Bi pair={lessonSubtitle(next)} /></span>
            <span className="steps" aria-hidden="true">
              {next.unit.lessons.map((l, i) => <i key={l.id} className={done.has(l.id) ? 'on' : i === next.idx ? 'cur' : ''} />)}
            </span>
            <span className="hero-btn"><Icon name="play" size={16} /> <Bi k={fresh ? 'start' : 'continue'} /></span>
          </button>
        ) : (
          <div className="action hero">
            <span className="kicker"><Bi k="path_soon_k" /></span>
            <span className="big"><Bi k="path_soon" /></span>
            <span className="hero-sub"><Bi k="path_soon_sub" /></span>
          </div>
        )}
        <div className="action-col">
          <button type="button" className="action" onClick={() => go('review')}>
            <span className="action-head"><Icon name="cards" size={20} /><b><Bi k="review_title" /></b></span>
            <span className="muted">{due ? <Bi pair={tx('review_due', due)} /> : <Bi k="review_none" />}</span>
          </button>
          <div className="action goal">
            <Ring value={minutes} max={settings.goal} size={58}><b>{minutes}</b><small>/{settings.goal}</small></Ring>
            <span className="goal-text">
              <b><Bi k="minutes_today" /></b>
              <span className="muted"><Icon name="flame" size={15} /> {st} <Bi k={st === 1 ? 'streak_1' : 'streak'} /></span>
            </span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2><Bi k="my_path" dual /></h2>
          <span className="muted small">{unitsDone} / {UNITS.length} <Bi k="units_done" /></span>
        </div>
        <ol className="units">
          {UNITS.map((u) => {
            const p = unitProgress(u, done);
            return (
              <li key={u.id}>
                <button type="button" className={`unit-row ${p.state}`} disabled={p.state === 'soon'} onClick={() => go('unit', { id: u.id })}>
                  <span className="unit-n">{p.state === 'done' ? <Icon name="check" size={16} /> : u.n}</span>
                  <span className="unit-main">
                    <b><Bi pair={[u.fr, u.tr]} /></b>
                    <span className="muted small"><Bi pair={u.focus} /></span>
                    {p.state !== 'soon' && <Meter value={p.n} max={p.total} />}
                  </span>
                  <span className="unit-state">
                    {p.state === 'soon' ? <span className="tag soon"><Bi k="soon" /></span> : <span className="small muted">{p.n}/{p.total}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
