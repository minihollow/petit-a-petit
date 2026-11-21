import { Bi, Parts, Pron, SpeakBtn } from './ui.jsx';

// Same pronunciation, same letter: "6 spellings, 3 sounds". Only when some sounds repeat.
export function soundGroups(rows) {
  const count = new Map();
  for (const r of rows) if (r.phon) count.set(r.phon, (count.get(r.phon) || 0) + 1);
  const groups = new Map();
  if (![...count.values()].some((n) => n > 1)) return groups;
  for (const r of rows) if (r.phon && !groups.has(r.phon)) groups.set(r.phon, 'ABCDEF'[groups.size]);
  return groups;
}

export default function ConjTable({ rows, compact = false }) {
  const groups = soundGroups(rows);
  return (
    <div className="conj-wrap">
      <table className={`conj${compact ? ' compact' : ''}`}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.i}>
              <td className="lbl" lang="fr">{r.label}</td>
              <td className="form"><Parts parts={r.parts} /></td>
              <td className="pron">
                {groups.get(r.phon) && <span className={`snd s${groups.get(r.phon)}`}>{groups.get(r.phon)}</span>}
                <Pron phon={r.phon} />
              </td>
              <td className="act"><SpeakBtn text={r.say} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend">
        <span><span className="p-stem">abc</span> <Bi k="legend_stem" inline /></span>
        <span><span className="p-end">abc</span> <Bi k="legend_end" inline /></span>
        <span><span className="p-sil">abc</span> <Bi k="legend_sil" inline /></span>
        {groups.size > 0 && <span><span className="snd sA">A</span> <Bi k="same_sound" inline /></span>}
      </div>
    </div>
  );
}
