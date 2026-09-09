// 把 games/_shared/leaderboard.js 的内容同步进每个自制游戏（games/<id>/index.html）里
// 位于 /* @lb-start */ … /* @lb-end */ 标记之间的代码块；没有标记的游戏跳过。
// 用法：node tools/inject.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'games', '_shared', 'leaderboard.js'), 'utf8').trim();
const START = '/* @lb-start */', END = '/* @lb-end */';
if (!src.startsWith(START) || !src.endsWith(END)) throw new Error('leaderboard.js 必须以标记开头结尾');
const only = new Set(process.argv.slice(2));
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8')).games.filter(g => g.local);
for (const g of games) {
  if (only.size && !only.has(g.id)) continue;
  const p = path.join(ROOT, g.local); const s = fs.readFileSync(p, 'utf8');
  const a = s.indexOf(START), b = s.indexOf(END);
  if (a < 0 || b < 0) { console.log('skip (no marker):', g.id); continue; }
  const out = s.slice(0, a) + src + s.slice(b + END.length);
  if (out !== s) { fs.writeFileSync(p, out); console.log('updated:', g.id); } else console.log('same:', g.id);
}
