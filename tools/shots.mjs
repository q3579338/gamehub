// 用 Edge 无头截每个游戏的封面 → .shots-tmp/<id>.png，再交给 shots-convert.py 压成 site/shots/<id>.jpg
// 前提：本地已起 node serve.js（默认 8795）。用法：node tools/shots.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const PORT = process.env.PORT || 8795;
const W = 1200, H = 750;
const EDGES = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const edge = EDGES.find(p => fs.existsSync(p));
if (!edge) throw new Error('找不到 msedge.exe');
const tmp = path.join(ROOT, '.shots-tmp');
fs.mkdirSync(tmp, { recursive: true });
const profile = path.join(tmp, 'profile'); // 独立 profile，别碰用户正在开的 Edge

for (const g of manifest.games) {
  if (only.size && !only.has(g.id)) continue;
  const out = path.join(tmp, `${g.id}.png`);
  fs.rmSync(out, { force: true });
  const url = `http://localhost:${PORT}/g/${g.id}/index.html?${g.shot || ''}`;
  process.stdout.write(`==> ${g.id}  ${url}\n`);
  const r = spawnSync(edge, [
    '--headless=new', '--no-first-run', '--hide-scrollbars', '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader', '--ignore-gpu-blocklist',
    `--user-data-dir=${profile}`, '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, `--screenshot-clip-rect=0,0,${W},${H}`,
    '--virtual-time-budget=25000', '--timeout=90000',
    `--screenshot=${out}`, url,
  ], { encoding: 'utf8', timeout: 180000 });
  if (!fs.existsSync(out)) {
    console.error('    FAIL', r.status, (r.stderr || '').split('\n').filter(l => /error|fail/i.test(l)).slice(0, 5).join(' | '));
    process.exitCode = 1;
  } else {
    console.log(`    OK ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
}
