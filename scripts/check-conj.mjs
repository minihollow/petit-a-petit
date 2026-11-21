// Prints conjugation tables as the app builds them, to check labels, answers, colouring and pronunciation.
// Usage: node scripts/check-conj.mjs [verb ...]
// Colouring: radical as is, pronounced ending in [brackets], silent letters in (parentheses).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..', 'web', 'src');
const { tableRows, TENSE_ORDER, grade } = await import(pathToFileURL(join(web, 'lib', 'conj.js')).href);
const { toTK, toIPA } = await import(pathToFileURL(join(web, 'lib', 'phon.js')).href);
const { verbs } = JSON.parse(readFileSync(join(web, 'data', 'verbs.json'), 'utf8'));
const byInf = new Map(verbs.map((v) => [v.inf, v]));
const lookup = (inf) => byInf.get(inf);

const show = (parts) => parts.map(([t, k]) => (k === 'end' ? `[${t}]` : k === 'sil' ? `(${t})` : t)).join('');
const list = process.argv.slice(2).length ? process.argv.slice(2) : ['parler', 'être', 'avoir', 'aller', 'finir', 'prendre', 'souvenir', 'asseoir', 'falloir', 'mettre'];
for (const inf of list) {
  const v = byInf.get(inf);
  if (!v) { console.log(`?? ${inf}`); continue; }
  console.log(`\n=== ${v.inf} (${v.tr}) groupe ${v.group}, ${v.aux}${v.pron ? ', pronominal' : ''}`);
  for (const t of TENSE_ORDER) {
    const rows = tableRows(v, t, lookup);
    if (!rows.length) continue;
    console.log(`  ${t}`);
    for (const r of rows) console.log(`    ${r.label.padEnd(16)} ${r.answer.padEnd(24)} ${show(r.parts).padEnd(26)} ${toTK(r.phon).padEnd(18)} [${toIPA(r.phon)}]  say="${r.say}"`);
  }
}
// grading samples
const v = byInf.get('parler');
const r = tableRows(v, 'ind:pre', lookup)[3];
for (const x of ['parlons', 'parlon', 'parlez', 'nous parlons', 'pârlons', 'mangeons']) console.log('grade', x, JSON.stringify(grade(x, r)));
const ra = tableRows(byInf.get('aller'), 'pc', lookup)[3];
for (const x of ['sommes allés', 'sommes allées', 'sommes allé', 'avons allé', 'sommes alles']) console.log('grade', x, JSON.stringify(grade(x, ra)));
