import { LESSON_KIND, UNIT_BY_ID, lessonSubtitle, unitProgress } from '../lib/course.js';
import { useApp } from '../store.js';
import { Bi, Icon, Meter, Tx, tx } from '../components/ui.jsx';

// A unit: its goal and its 6 lessons, the next one highlighted.
export default function Unit({ id }) {
  const { done, go } = useApp();
  const u = UNIT_BY_ID.get(id);
  if (!u) return null;
  const p = unitProgress(u, done);
  const next = u.lessons.find((l) => !done.has(l.id));
  return (
    <div className="page unit">
      <button type="button" className="link back" onClick={() => go('home')}><Icon name="back" size={18} /> <Bi k="nav_path" /></button>
      <header className="unit-head">
        <span className="kicker"><Bi pair={tx('unit_n', u.n)} /></span>
        <h1><Bi pair={[u.fr, u.tr]} dual /></h1>
        <p className="lead"><Tx v={u.goal} /></p>
        <div className="unit-meter"><Meter value={p.n} max={p.total} /><span className="small muted">{p.n}/{p.total}</span></div>
      </header>
      <ol className="lessons">
        {u.lessons.map((l, i) => {
          const K = LESSON_KIND[l.type];
          const isDone = done.has(l.id);
          const isNext = next?.id === l.id;
          return (
            <li key={l.id}>
              <button type="button" className={`lesson-row${isDone ? ' done' : ''}${isNext ? ' next' : ''}`} onClick={() => go('lesson', { id: l.id })}>
                <span className="lesson-ico">{isDone ? <Icon name="check" size={18} /> : <Icon name={K.icon} size={18} />}</span>
                <span className="lesson-main">
                  <b>{i + 1}. <Bi k={K.k} /></b>
                  <span className="muted small clamp"><Bi pair={lessonSubtitle(l)} /></span>
                </span>
                <span className="lesson-min small muted">{K.min} min</span>
              </button>
            </li>
          );
        })}
      </ol>
      {next
        ? <button type="button" className="btn primary big" onClick={() => go('lesson', { id: next.id })}><Bi k={p.n ? 'continue' : 'start'} /></button>
        : <p className="done-line"><Icon name="check" size={18} /> <Bi k="unit_done" /></p>}
    </div>
  );
}
