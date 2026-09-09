// 生成 OG 分享图 site/og.png(1200×630,白底:站名 + 一句英文标语 + 域名)。
// 给 /hall/ 这类没有游戏截图可用的页面做分享图;首页 og:image 仍用招牌游戏截图(1200×750)。
// 只在本机跑一次、产物进 git(site/og.png 不在 .gitignore 里,deploy.sh 随 site/ 一起打包)。
// 渲染用 @resvg/resvg-js(借 bnbbang 仓库里装好的那份,免再装依赖;可用 RESVG_MODULE 指到别处),字体只用系统字体。
// 用法:node tools/make-og.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Resvg } = require(process.env.RESVG_MODULE || 'D:/CLAUDE/bnbbang/server/node_modules/@resvg/resvg-js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8')).site;
const OUT = path.join(ROOT, 'site', 'og.png');

// resvg 在 Windows 上取不到 Segoe UI 的粗体变体,标题用微软雅黑 700(中英都有粗体);正文用 Segoe UI
const BOLD = 'Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif';
const TEXT = 'Segoe UI, Microsoft YaHei, sans-serif';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g1" cx="0.15" cy="-0.1" r="0.8"><stop offset="0" stop-color="#ff7a59" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a59" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.9" cy="0" r="0.7"><stop offset="0" stop-color="#ffd166" stop-opacity=".22"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
    <linearGradient id="pad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a59"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <!-- 右侧:favicon 同款手柄,放大 5 倍 -->
  <g transform="translate(850 190) scale(5)">
    <rect x="4" y="18" width="56" height="30" rx="12" fill="url(#pad)"/>
    <rect x="14" y="27" width="12" height="4" rx="2" fill="#0b0e17"/>
    <rect x="18" y="23" width="4" height="12" rx="2" fill="#0b0e17"/>
    <circle cx="44" cy="29" r="3" fill="#0b0e17"/>
    <circle cx="50" cy="35" r="3" fill="#0b0e17"/>
  </g>
  <g font-family="${TEXT}">
    <rect x="80" y="118" width="8" height="26" rx="3" fill="#ff6a3d"/>
    <text x="104" y="139" font-family="${BOLD}" font-size="22" font-weight="700" fill="#5b647a" letter-spacing="2">SATLOOT · ${esc(S.title)}</text>
    <text x="80" y="266" font-family="${BOLD}" font-size="84" font-weight="700" fill="#141826">${esc(S.titleEn)}</text>
    <text x="80" y="340" font-size="34" fill="#5b647a">Tiny single-file browser games.</text>
    <text x="80" y="386" font-size="34" fill="#5b647a">Free, no ads, no sign-up. Click and play.</text>
    <line x1="80" y1="494" x2="740" y2="494" stroke="#e6e9f0" stroke-width="2"/>
    <text x="80" y="548" font-family="${BOLD}" font-size="30" font-weight="700" fill="#ff6a3d">${esc(S.domain)}</text>
  </g>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng();
fs.writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${png.length} bytes, 1200×630)`);
