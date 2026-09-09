// 把每个游戏的单文件本体放到 site/g/<id>/index.html，并记录版本信息到 upstream/meta.json
//  - 远程游戏（有 repo + dist）：用 gh 从 GitHub 拉，按最近提交 sha 判断是否需要重下（私有仓也能拉，需 gh 已登录）
//  - 本站自制游戏（有 local）：直接从仓库内 games/<id>/index.html 复制，按内容 sha1 判断变化
// 用法：node tools/fetch.mjs [id ...]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const metaPath = path.join(ROOT, 'upstream', 'meta.json');
fs.mkdirSync(path.dirname(metaPath), { recursive: true });
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};

const gh = (args, opts = {}) => execFileSync('gh', args, { encoding: opts.buffer ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
const looksLikeGame = buf => buf.length >= 1000 && /<(canvas|script|title)/i.test(buf.subarray(0, 4000).toString('utf8'));
// 单文件约定：不许有任何外部请求（粗检：http(s):// 的 src/href/import/fetch）
const externalRefs = buf => {
  const s = buf.toString('utf8');
  const m = s.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi) || [];
  return m.filter(x => !/rel=|<a /i.test(x));
};

for (const g of manifest.games) {
  if (only.size && !only.has(g.id)) continue;
  const outDir = path.join(ROOT, 'site', 'g', g.id);
  const out = path.join(outDir, 'index.html');

  if (g.local) {
    const src = path.join(ROOT, g.local);
    process.stdout.write(`==> ${g.id}  (本站自制 ${g.local})\n`);
    if (!fs.existsSync(src)) throw new Error(`${g.id}: 找不到 ${g.local}`);
    const buf = fs.readFileSync(src);
    if (!looksLikeGame(buf)) throw new Error(`${g.id}: ${g.local} 不像游戏页面（${buf.length} 字节）`);
    const ext = externalRefs(buf);
    if (ext.length) throw new Error(`${g.id}: 含外部资源引用：${ext.slice(0, 3).join(' | ')}`);
    const sha = crypto.createHash('sha1').update(buf).digest('hex');
    const date = fs.statSync(src).mtime.toISOString();
    if (meta[g.id]?.sha === sha && fs.existsSync(out)) { process.stdout.write(`    未变（${sha.slice(0, 7)}），跳过\n`); continue; }
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(out, buf);
    meta[g.id] = { sha, date, size: buf.length, fetchedAt: new Date().toISOString(), local: true };
    process.stdout.write(`    ${(buf.length / 1024).toFixed(0)} KB  sha1 ${sha.slice(0, 7)}  ${date}\n`);
    continue;
  }

  process.stdout.write(`==> ${g.id}  (${g.repo}/${g.dist})\n`);
  // 最近一次触碰该文件的提交：时间 + sha，用来显示「更新于」并判断是否需要重下
  const commits = JSON.parse(gh(['api', `repos/${g.repo}/commits?path=${encodeURIComponent(g.dist)}&per_page=1`]));
  const c = commits[0];
  const sha = c?.sha || '';
  const date = c?.commit?.committer?.date || c?.commit?.author?.date || '';
  if (meta[g.id]?.sha === sha && fs.existsSync(out)) {
    process.stdout.write(`    未变（${sha.slice(0, 7)}），跳过\n`);
    continue;
  }
  const buf = gh(['api', '-H', 'Accept: application/vnd.github.raw+json', `repos/${g.repo}/contents/${g.dist}`], { buffer: true });
  if (!looksLikeGame(buf)) throw new Error(`${g.id}: 拉到的内容不像游戏页面（${buf.length} 字节）`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, buf);
  meta[g.id] = { sha, date, size: buf.length, fetchedAt: new Date().toISOString() };
  process.stdout.write(`    ${(buf.length / 1024).toFixed(0)} KB  提交 ${sha.slice(0, 7)}  ${date}\n`);
}
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
console.log('meta →', path.relative(ROOT, metaPath));
