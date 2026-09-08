// 从 GitHub 拉每个游戏的 dist 单文件 → site/g/<id>/index.html，并记录提交信息到 upstream/meta.json
// 依赖：gh CLI 已登录（私有仓也能拉）。用法：node tools/fetch.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const metaPath = path.join(ROOT, 'upstream', 'meta.json');
fs.mkdirSync(path.dirname(metaPath), { recursive: true });
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: opts.buffer ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });

for (const g of manifest.games) {
  if (only.size && !only.has(g.id)) continue;
  process.stdout.write(`==> ${g.id}  (${g.repo}/${g.dist})\n`);
  // 最近一次触碰该文件的提交：时间 + sha，用来显示「更新于」并判断是否需要重下
  const commits = JSON.parse(gh(['api', `repos/${g.repo}/commits?path=${encodeURIComponent(g.dist)}&per_page=1`]));
  const c = commits[0];
  const sha = c?.sha || '';
  const date = c?.commit?.committer?.date || c?.commit?.author?.date || '';
  const outDir = path.join(ROOT, 'site', 'g', g.id);
  const out = path.join(outDir, 'index.html');
  if (meta[g.id]?.sha === sha && fs.existsSync(out)) {
    process.stdout.write(`    未变（${sha.slice(0, 7)}），跳过\n`);
    continue;
  }
  const buf = gh(['api', '-H', 'Accept: application/vnd.github.raw+json', `repos/${g.repo}/contents/${g.dist}`], { buffer: true });
  if (buf.length < 1000 || !/<(canvas|script|title)/i.test(buf.subarray(0, 4000).toString('utf8'))) {
    throw new Error(`${g.id}: 拉到的内容不像游戏页面（${buf.length} 字节）`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, buf);
  meta[g.id] = { sha, date, size: buf.length, fetchedAt: new Date().toISOString() };
  process.stdout.write(`    ${(buf.length / 1024).toFixed(0)} KB  提交 ${sha.slice(0, 7)}  ${date}\n`);
}
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
console.log('meta →', path.relative(ROOT, metaPath));
