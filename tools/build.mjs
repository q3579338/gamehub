// 由 games.json + upstream/meta.json 生成 site/：首页、/play/ 壳、/hall/ 英雄榜、games.json、robots、sitemap
// 中英双语（沿用 satloot-home 的方案）：中文在 / 、英文在 /en/ ，三个模板都按语言表 L 各渲染一份；
//   /            /play/?g=<id>      /hall/        zh-CN
//   /en/         /en/play/?g=<id>   /en/hall/     en
// 游戏本体 /g/<id>/ 只有一份，两种语言的壳都指向它。英文文案来自 games.json 的 *En 字段，缺了回落中文。
// 首访：/ 页首有一段小脚本，localStorage 没记过 gh:lang 且浏览器语言不是 zh 开头就跳 /en/；点过语言切换后不再自动跳。
// 用法：node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const metaPath = path.join(ROOT, 'upstream', 'meta.json');
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
const S = m.site;
const ORIGIN = `https://${S.domain}`;
const CATS = S.categories || [{ id: 'all', name: '全部', nameEn: 'All' }];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kb = n => n >= 1024 * 1024 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
const ymd = iso => iso ? iso.slice(0, 10) : '';
const catOf = g => CATS.find(c => c.id === g.cat) || CATS[0];
const YEAR = new Date().getFullYear();
const OG_IMG = `${ORIGIN}/og.png`;   // 1200×630 站点分享图(tools/make-og.mjs 生成),给 /hall/ 用;首页 og:image 用招牌游戏截图(1200×750)
const ORG_ID = 'https://satloot.com/#organization';
const ORG = { '@type': 'Organization', '@id': ORG_ID, name: 'satloot', url: 'https://satloot.com/', sameAs: [S.github] };
// JSON-LD 里的 < 转义成 \u003c,免得条目文本里出现 </script> 把页面截断
const ld = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
/** meta description:前缀 + 尽量多的名字 + 后缀,总长不超过 max(SEO 建议 80–160 字符);suffix(k) 拿到实际塞进去的名字数 */
const clampNames = (prefix, names, sep, suffix, max = 158) => {
  const used = [];
  for (const n of names) { if ((prefix + [...used, n].join(sep) + suffix(used.length + 1)).length > max) break; used.push(n); }
  return prefix + used.join(sep) + suffix(used.length);
};

// ---------- 两种语言的界面文案 ----------
const LOCALES = {
  zh: {
    en: false, code: 'zh', htmlLang: 'zh-CN', dir: '', ogLocale: 'zh_CN', currency: 'CNY',
    other: 'en', otherHtmlLang: 'en', otherLabel: 'EN', otherDir: 'en/',
    siteTitle: S.title, tagline: S.tagline, taglineAlt: S.taglineEn,
    ogLocaleAlt: 'en_US',
    docTitle: `${S.title} · ${S.tagline}`,
    metaDesc: names => clampNames(`${S.tagline}：`, names, '、', k => `${k < names.length ? '等' : '，共'} ${names.length} 款，免费、无广告、不登录。`),
    ogTitle: `${S.title} · ${S.titleEn}`,
    nav: { games: '游戏', hall: '🏆 英雄榜', about: '关于', github: 'GitHub ↗' },
    themeTitle: '切换深色 / 浅色',
    h1: n => `${n} 款小游戏，<em>打开即玩</em>`,
    heroLine: '每个游戏都是一个 HTML 文件，程序化生成画面与音效，没有任何外部资源；存档只存在你自己的浏览器里。',
    pills: (n, c, d) => [`<b>${n}</b> 款游戏`, `<b>${c}</b> 个分类`, `<b>${d}</b> 款 3D · Three.js`, '单文件 · 零依赖', '键盘 + 触屏', '手机也能玩', '免费 · 无广告 · 不登录'],
    all: '全部', catSmall: (n, engines) => `${n} 款 · ${engines}`,
    searchPh: '搜索游戏 / 标签', luckyTitle: '随机打开一个游戏', lucky: '随机来一局',
    empty: '没有找到匹配的游戏，换个词试试。',
    play: '▶ 开始游戏', playAria: t => `开始游戏：${t}`, shotAlt: t => `${t} 游戏画面`,
    updated: d => `更新于 ${d}`,
    srcLocal: '本站自制', srcLocalTitle: '本站自制，源码在 gamehub 仓库 games/ 目录', srcOpen: '源码 ↗', srcLockedTitle: '仓库暂未公开',
    aboutH: '关于这个站',
    about: [
      '这里收录我在 GitHub 上写的小游戏，以及本站自制的一批休闲小游戏。3D 的用 Three.js，2D 的用 Canvas，全部是程序化生成：没有图片、没有模型、没有字体文件，整个游戏就是一个 HTML。',
      '存档（金币、装扮、关卡进度、最高分）走浏览器 localStorage，只存在你自己的设备上，本站没有后端、不收集任何数据。换浏览器或清缓存会丢档。',
      '3D 游戏在手机上会比较吃性能，卡的话可以在游戏内暂停菜单关掉后处理特效；电脑上用 Chrome / Edge 体验最好。右上角 🌙 可以切换深色模式。',
    ],
    familyH: 'satloot 家族', allRepos: '全部源码仓库',
    // /play/ 壳
    frameTitle: '游戏', back: '← 游戏厅', switchTitle: '换一个游戏', switchLbl: '换游戏', hallLbl: '英雄榜',
    helpTitle: '操作说明', helpLbl: '操作', fsLbl: '全屏', fsExit: '退出全屏', rawTitle: '在新窗口直接打开游戏文件', rawLbl: '新窗口', srcLbl: '源码',
    handleTitle: '显示工具栏', nogame: '没有这个游戏。', backHome: '← 回游戏厅',
    helpNote: '存档在本机浏览器 · Esc 一般为暂停 · 鼠标贴到最顶边或点顶部小把手可呼出工具栏',
    // /hall/ 英雄榜
    hallTitle: '英雄榜', hallMeta: names => clampNames(`${S.title}英雄榜：`, names, '、', k => `${k < names.length ? ' 等' : ''} ${names.length} 款游戏各难度前 20 名玩家，打出新纪录可留名上榜。`),
    hallSub: '各游戏各难度前 20 名。打出新纪录时，结算面板里可以留下名字上榜；数据每次打开实时拉取。',
    goPlay: '▶ 去玩', loading: '加载中…',
    hallNote: '榜单只收合理范围内的成绩，同一 IP 每 10 分钟最多上榜 12 次；名字最多 12 个字。数独用了提示的成绩不计入。',
    unavailable: '榜单暂时打不开', noEntries: '虚位以待，来当第一个！',
    fmtSec: ' 秒', fmtMoves: ' 步', fmtPts: ' 分',
  },
  en: {
    en: true, code: 'en', htmlLang: 'en', dir: 'en/', ogLocale: 'en_US', currency: 'USD',
    other: 'zh', otherHtmlLang: 'zh-CN', otherLabel: '中文', otherDir: '',
    siteTitle: S.titleEn || S.title, tagline: S.taglineEn || S.tagline, taglineAlt: '',
    ogLocaleAlt: 'zh_CN',
    docTitle: `${S.titleEn || S.title} · Tiny free browser games, click and play`,
    metaDesc: names => clampNames('Tiny single-file browser games from GitHub: ', names, ', ', k => `${k < names.length ? ' and more' : ''}. ${names.length} free games, no ads, no sign-up.`),
    ogTitle: `${S.titleEn || S.title}`,
    nav: { games: 'Games', hall: '🏆 Hall of Fame', about: 'About', github: 'GitHub ↗' },
    themeTitle: 'Toggle dark / light',
    h1: n => `${n} tiny games, <em>ready to play</em>`,
    heroLine: 'Every game is a single HTML file with procedurally generated graphics and sound and no external assets; saves stay in your own browser.',
    pills: (n, c, d) => [`<b>${n}</b> games`, `<b>${c}</b> categories`, `<b>${d}</b> in 3D · Three.js`, 'Single-file · zero dependency', 'Keyboard + touch', 'Works on phones', 'Free · no ads · no sign-up'],
    all: 'All', catSmall: (n, engines) => `${n} ${n === 1 ? 'game' : 'games'} · ${engines}`,
    searchPh: 'Search games / tags', luckyTitle: 'Open a random game', lucky: 'Random game',
    empty: 'No games match. Try another word.',
    play: '▶ Play', playAria: t => `Play ${t}`, shotAlt: t => `${t} screenshot`,
    updated: d => `updated ${d}`,
    srcLocal: 'Made here', srcLocalTitle: 'Made for this site; source is in the gamehub repo under games/', srcOpen: 'Source ↗', srcLockedTitle: 'Repository not public yet',
    aboutH: 'About this site',
    about: [
      'This site collects the small games I wrote on GitHub plus a batch of casual games made in-house. The 3D ones use Three.js, the 2D ones use Canvas, and everything is procedural: no images, no models, no font files. Each game is one HTML file.',
      'Saves (coins, outfits, level progress, high scores) live in your browser’s localStorage, on your own device only. There are no accounts and no personal data is collected. Switching browsers or clearing site data will lose them.',
      '3D games are demanding on phones; if they stutter, turn off post-processing in the in-game pause menu. On desktop, Chrome / Edge work best. The 🌙 button in the top-right toggles dark mode.',
    ],
    familyH: 'satloot family', allRepos: 'all source repos',
    frameTitle: 'Game', back: '← Arcade', switchTitle: 'Switch to another game', switchLbl: 'Switch', hallLbl: 'Hall of Fame',
    helpTitle: 'Controls', helpLbl: 'Controls', fsLbl: 'Fullscreen', fsExit: 'Exit fullscreen', rawTitle: 'Open the raw game file in a new tab', rawLbl: 'New tab', srcLbl: 'Source',
    handleTitle: 'Show toolbar', nogame: 'No such game.', backHome: '← Back to the arcade',
    helpNote: 'Saves live in this browser · Esc usually pauses · move the mouse to the top edge or tap the handle to show the toolbar',
    hallTitle: 'Hall of Fame', hallMeta: names => clampNames(`${S.titleEn || S.title} hall of fame: top 20 per difficulty in `, names, ', ', k => `${k < names.length ? ' and more' : ''}. Set a record and leave your name.`),
    hallSub: 'Top 20 per game and difficulty. Set a new record and the results panel lets you leave your name; data is fetched live on every visit.',
    goPlay: '▶ Play', loading: 'Loading…',
    hallNote: 'Only scores within a sane range are accepted; one IP may post at most 12 entries per 10 minutes; names are up to 12 characters. Sudoku runs that used hints do not count.',
    unavailable: 'Leaderboard unavailable right now', noEntries: 'No entries yet. Be the first!',
    fmtSec: ' s', fmtMoves: ' moves', fmtPts: ' pts',
  },
};
// 取字段：英文页优先 *En，没有就回落中文
const pick = (L, o, k) => (L.en && o[k + 'En']) ? o[k + 'En'] : o[k];
const catName = (L, c) => pick(L, c, 'name');
const langSwitch = (L, href, cls = 'lang-switch') =>
  `<a class="${cls}" href="${href}" hreflang="${L.otherHtmlLang}" lang="${L.otherHtmlLang}" onclick="try{localStorage.setItem('gh:lang','${L.other}')}catch(e){}">${L.otherLabel}</a>`;
const altLinks = sub => `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/${sub}">
<link rel="alternate" hreflang="en" href="${ORIGIN}/en/${sub}">
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${sub}">`;
// 首访语言：只放在中文首页。没记过选择且浏览器语言不是 zh 开头 → 跳英文页；点过切换链接后不再自动跳
const LANG_REDIRECT = `<script>(function(){try{if(localStorage.getItem('gh:lang'))return;var l=(navigator.language||'').toLowerCase();if(l&&l.slice(0,2)!=='zh')location.replace('/en/'+location.search+location.hash)}catch(e){}})()</script>`;
const THEME_BOOT = `<script>(function(){try{var t=localStorage.getItem('gh:theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()</script>`;

// 公开清单（两种语言的字段都带上，play 壳与第三方都用得上）
const pub = m.games.map(g => ({
  id: g.id, title: g.title, titleEn: g.titleEn, desc: g.desc, descEn: g.descEn, kind: g.kind, engine: g.engine,
  cat: g.cat, catName: catOf(g).name, catNameEn: catOf(g).nameEn || catOf(g).name,
  tags: g.tags, tagsEn: g.tagsEn || g.tags, controls: g.controls, controlsEn: g.controlsEn || g.controls,
  repo: g.repo || null, public: !!g.public, local: !!g.local, boards: g.boards || null,
  url: `/play/?g=${g.id}`, urlEn: `/en/play/?g=${g.id}`, file: `/g/${g.id}/index.html`, shot: `/shots/${g.id}.jpg`,
  size: meta[g.id]?.size ?? null, updated: ymd(meta[g.id]?.date),
}));
fs.writeFileSync(path.join(SITE, 'games.json'), JSON.stringify({ site: { domain: S.domain, title: S.title, titleEn: S.titleEn, categories: CATS }, games: pub }, null, 2));

const FONT = `"PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="18" width="56" height="30" rx="12" fill="#ff7a59"/><rect x="14" y="27" width="12" height="4" rx="2" fill="#0b0e17"/><rect x="18" y="23" width="4" height="12" rx="2" fill="#0b0e17"/><circle cx="44" cy="29" r="3" fill="#0b0e17"/><circle cx="50" cy="35" r="3" fill="#0b0e17"/></svg>`)}`;

// ---------- 首页 ----------
function indexPage(L) {
  const T = g => pick(L, g, 'title');
  const srcLine = g => g.local
    ? `<span class="src local" title="${esc(L.srcLocalTitle)}">${esc(L.srcLocal)}</span>`
    : g.public
      ? `<a class="src" href="https://github.com/${esc(g.repo)}" target="_blank" rel="noopener">${esc(L.srcOpen)}</a>`
      : `<span class="src locked" title="${esc(L.srcLockedTitle)}">${esc(g.repo.split('/')[1])}</span>`;

  const card = (g, i) => {
    const tags = pick(L, g, 'tags') || [];
    const q = [T(g), L.en ? '' : g.titleEn, ...tags, g.kind, g.engine, catName(L, catOf(g))].join(' ').toLowerCase();
    const href = `/${L.dir}play/?g=${g.id}`;
    return `
      <article class="card${g.featured ? ' featured' : ''}" data-kind="${esc(g.kind)}" data-cat="${esc(g.cat)}" data-q="${esc(q)}">
        <a class="shot" href="${href}" aria-label="${esc(L.playAria(T(g)))}">
          <img src="/shots/${g.id}.jpg" srcset="/shots/${g.id}-s.jpg 600w, /shots/${g.id}.jpg 1200w" sizes="(max-width: 720px) 100vw, ${g.featured ? '66vw' : '33vw'}" width="1200" height="750" alt="${esc(L.shotAlt(T(g)))}"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>
          <span class="kind">${esc(g.kind)} · ${esc(g.engine)}</span>
          <span class="play-hint">${L.play}</span>
        </a>
        <div class="body">
          <h3><a href="${href}">${esc(T(g))}</a></h3>
          ${L.en ? '' : `<div class="en">${esc(g.titleEn)}</div>`}
          <p class="desc">${esc(pick(L, g, 'desc'))}</p>
          ${L.en ? '' : `<p class="desc-en">${esc(g.descEn)}</p>`}
          <ul class="tags">${tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <div class="foot">
            <a class="btn" href="${href}">${L.play}</a>
            <span class="meta">${meta[g.id] ? `${kb(meta[g.id].size)} · ${esc(L.updated(ymd(meta[g.id].date)))}` : ''}</span>
            ${srcLine(g)}
          </div>
        </div>
      </article>`;
  };

  const sections = CATS.map(c => {
    const gs = m.games.filter(g => g.cat === c.id); if (!gs.length) return '';
    const engines = [...new Set(gs.map(g => g.engine))].join(' / ');
    return `
  <section class="cat" id="cat-${c.id}" data-cat="${c.id}">
    <h2 class="cat-h"><span>${esc(catName(L, c))}</span><small>${esc(L.catSmall(gs.length, engines))}</small></h2>
    <div class="grid">${gs.map(g => card(g, m.games.indexOf(g))).join('\n')}
    </div>
  </section>`;
  }).join('\n');

  const url = `${ORIGIN}/${L.dir}`;
  const hero = m.games.find(g => g.featured) || m.games[0];
  const heroImg = `${ORIGIN}/shots/${hero.id}.jpg`;
  const desc = L.metaDesc(m.games.map(T));
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    ORG,
    { '@type': 'WebSite', '@id': `${url}#website`, url, name: L.siteTitle, alternateName: L.en ? S.title : S.titleEn, description: L.tagline, inLanguage: L.htmlLang, publisher: { '@id': ORG_ID } },
    { '@type': 'WebPage', '@id': url, url, name: L.docTitle, description: desc, inLanguage: L.htmlLang, isPartOf: { '@id': `${url}#website` }, primaryImageOfPage: { '@type': 'ImageObject', url: heroImg, width: 1200, height: 750 } },
    { '@type': 'ItemList', name: L.siteTitle, url, inLanguage: L.htmlLang, numberOfItems: m.games.length,
    itemListElement: m.games.map((g, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'VideoGame', name: T(g), alternateName: L.en ? g.title : g.titleEn, url: `${ORIGIN}/${L.dir}play/?g=${g.id}`, image: `${ORIGIN}/shots/${g.id}.jpg`,
        description: pick(L, g, 'desc'), genre: catName(L, catOf(g)), gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any', inLanguage: 'zh-CN',
        offers: { '@type': 'Offer', price: '0', priceCurrency: L.currency } },
    })) },
  ] };

  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
${L.en ? '' : LANG_REDIRECT + '\n'}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(L.docTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${altLinks('')}
<link rel="icon" href="${FAVICON}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(L.siteTitle)}">
<meta property="og:title" content="${esc(L.ogTitle)}">
<meta property="og:description" content="${esc(L.tagline)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.ogLocale}">
<meta property="og:locale:alternate" content="${L.ogLocaleAlt}">
<meta property="og:image" content="${heroImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="750">
<meta property="og:image:alt" content="${esc(L.shotAlt(T(hero)))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(L.ogTitle)}">
<meta name="twitter:description" content="${esc(L.tagline)}">
<meta name="twitter:image" content="${heroImg}">
<script type="application/ld+json">${ld(jsonld)}</script>
${THEME_BOOT}
<style>
:root{--bg:#ffffff;--bg2:#f6f7fb;--card:#ffffff;--card2:#f1f3f8;--line:#e6e9f0;--line2:#cfd5e1;--text:#141826;--muted:#5b647a;--dim:#8a93a8;
  --accent:#ff6a3d;--accent2:#d98f00;--accent-ink:#fff;--r:16px;--shadow:0 12px 30px -18px rgba(20,24,38,.28);--shadow2:0 22px 44px -22px rgba(255,106,61,.35);--glow1:rgba(255,122,89,.10);--glow2:rgba(255,209,102,.12);--chipbg:#fff;--barbg:rgba(255,255,255,.86)}
[data-theme=dark]{--bg:#0b0e17;--bg2:#10141f;--card:#151a28;--card2:#1b2133;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.18);--text:#e8ecf5;--muted:#8b93a7;--dim:#5f677a;
  --accent:#ff7a59;--accent2:#ffd166;--accent-ink:#1a0f0a;--shadow:0 18px 40px -22px rgba(0,0,0,.7);--shadow2:0 18px 40px -22px rgba(255,122,89,.35);--glow1:rgba(255,122,89,.16);--glow2:rgba(255,209,102,.10);--chipbg:rgba(255,255,255,.04);--barbg:rgba(11,14,23,.86)}
*{box-sizing:border-box}
html{color-scheme:light;-webkit-text-size-adjust:100%;scroll-behavior:smooth}
[data-theme=dark]{color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 ${FONT};
  background-image:radial-gradient(900px 420px at 15% -10%,var(--glow1),transparent 60%),radial-gradient(700px 380px at 90% 0%,var(--glow2),transparent 60%);
  background-repeat:no-repeat}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:.2px}
.brand img{width:28px;height:28px;display:block}
.brand small{font-weight:500;color:var(--muted);font-size:12px;letter-spacing:.6px;text-transform:uppercase;margin-left:4px}
nav{display:flex;align-items:center;gap:4px}
nav a{color:var(--muted);font-size:14px;margin-left:14px;padding:6px 0;border-bottom:1px solid transparent}
nav a:hover{color:var(--text);border-bottom-color:var(--line2)}
nav a.lang-switch{padding:4px 11px;border:1px solid var(--line);border-radius:999px;background:var(--chipbg);font-weight:700;font-size:12.5px;color:var(--text)}
nav a.lang-switch:hover{border-color:var(--accent);color:var(--accent)}
.theme{margin-left:14px;border:1px solid var(--line);background:var(--chipbg);color:var(--muted);border-radius:999px;width:34px;height:34px;cursor:pointer;font-size:16px;display:inline-flex;align-items:center;justify-content:center}
.theme:hover{color:var(--text);border-color:var(--line2)}
.hero{padding:30px 0 22px}
.hero h1{margin:0 0 10px;font-size:clamp(28px,4.6vw,44px);line-height:1.15;letter-spacing:-.3px;font-weight:800}
.hero h1 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{margin:0;color:var(--muted);max-width:720px;font-size:16px}
.hero p.en{font-size:13.5px;color:var(--dim);margin-top:4px}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.pills span{font-size:12.5px;color:var(--muted);border:1px solid var(--line);background:var(--chipbg);border-radius:999px;padding:5px 11px}
.pills span b{color:var(--accent);font-weight:800}
/* category bar: sticky */
.catbar{position:sticky;top:0;z-index:20;background:var(--barbg);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:10px}
.catbar .row{display:flex;align-items:center;gap:10px;padding:10px 20px}
.chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;padding:2px 0}
.chips::-webkit-scrollbar{display:none}
.chip{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--muted);border:1px solid var(--line);background:var(--chipbg);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap;transition:all .15s}
.chip b{font-weight:700;font-size:11.5px;color:var(--dim);background:var(--card2);border-radius:999px;padding:0 6px;line-height:18px}
.chip:hover{color:var(--text);border-color:var(--line2)}
.chip.on{color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}
.chip.on b{color:var(--accent-ink);background:rgba(0,0,0,.18)}
.search{flex:none;display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--chipbg);border-radius:999px;padding:0 10px;height:34px;color:var(--dim)}
.search input{border:0;background:none;outline:0;font:inherit;font-size:13.5px;color:var(--text);width:140px}
.search input::placeholder{color:var(--dim)}
.lucky{flex:none;border:0;background:var(--card2);color:var(--text);font:inherit;font-weight:700;font-size:13.5px;border-radius:999px;height:34px;padding:0 13px;cursor:pointer}
.lucky:hover{background:var(--line)}
@media (max-width:720px){.catbar .row{flex-wrap:wrap;padding:8px 14px}.chips{order:3;flex-basis:100%}.search{flex:1}.search input{width:100%}.lucky span{display:none}}
/* sections and cards */
.cat{padding:22px 0 6px}
.cat[hidden]{display:none}
.cat-h{display:flex;align-items:baseline;gap:12px;margin:0 0 4px;font-size:22px;font-weight:800;letter-spacing:-.2px}
.cat-h::before{content:"";width:6px;height:22px;border-radius:3px;background:linear-gradient(180deg,var(--accent),var(--accent2));align-self:center}
.cat-h small{font-weight:500;color:var(--dim);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:12px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.card[hidden]{display:none}
.card:hover{transform:translateY(-3px);border-color:rgba(255,106,61,.5);box-shadow:var(--shadow2)}
.shot{position:relative;display:block;aspect-ratio:16/10;background:#000;overflow:hidden}
.shot img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}
.card:hover .shot img{transform:scale(1.035)}
.kind{position:absolute;left:12px;top:12px;font-size:11.5px;font-weight:700;letter-spacing:.4px;color:#fff;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 9px}
.play-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;background:rgba(0,0,0,.28);opacity:0;transition:opacity .2s}
.play-hint::before{content:"";position:absolute;width:76px;height:76px;border-radius:50%;background:rgba(255,106,61,.92);z-index:-1;box-shadow:0 10px 30px rgba(255,106,61,.5)}
.card:hover .play-hint{opacity:1}
.body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.body h3{margin:0;font-size:19px;line-height:1.3;font-weight:800}
.body h3 a:hover{color:var(--accent)}
.en{color:var(--dim);font-size:12px;letter-spacing:.5px;text-transform:uppercase}
.desc{margin:6px 0 0;color:var(--muted);font-size:14px}
.desc-en{margin:0;color:var(--dim);font-size:12.5px;line-height:1.5}
.tags{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.tags li{font-size:12px;color:var(--muted);background:var(--card2);border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.foot{display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:14px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--accent),#ff9a76);color:#fff;font-weight:800;font-size:14px;border-radius:10px;padding:9px 16px;box-shadow:0 8px 20px -10px rgba(255,106,61,.9)}
.btn:hover{filter:brightness(1.06)}
.meta{color:var(--dim);font-size:12px}
.src{margin-left:auto;font-size:12.5px;color:var(--muted)}
a.src:hover{color:var(--text)}
.src.locked{color:var(--dim);cursor:default}
.src.locked::before{content:"🔒 ";font-size:11px}
.src.local{color:var(--dim);cursor:default}
.src.local::before{content:"🏠 ";font-size:11px}
.featured .body h3{font-size:22px}
@media (min-width:720px){.featured{grid-column:span 2}.featured .shot{aspect-ratio:2/1}}
@media (max-width:480px){.grid{grid-template-columns:1fr;gap:16px}.body{padding:14px 15px 16px}nav a{margin-left:10px}.brand small{display:none}}
.empty{display:none;text-align:center;color:var(--dim);padding:60px 0}
.empty.show{display:block}
.about{margin:44px 0 0;padding:28px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:1.4fr 1fr;gap:36px}
.about h3{margin:0 0 10px;font-size:16px}
.about p{margin:0 0 10px;color:var(--muted);font-size:14px}
.about ul{list-style:none;margin:0;padding:0}
.about li{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px dashed var(--line);font-size:14px}
.about li a{color:var(--text);font-weight:600;white-space:nowrap}
.about li a:hover{color:var(--accent)}
.about li span{color:var(--dim);font-size:13px}
@media (max-width:720px){.about{grid-template-columns:1fr;gap:20px}}
footer{padding:36px 0 40px;color:var(--dim);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
footer a{color:var(--muted)}footer a:hover{color:var(--text)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/${L.dir}"><img src="${FAVICON}" alt="">${esc(L.siteTitle)}<small>${esc(S.domain)}</small></a>
    <nav><a href="#games">${L.nav.games}</a><a href="/${L.dir}hall/">${L.nav.hall}</a><a href="#about">${L.nav.about}</a><a href="${esc(S.github)}" target="_blank" rel="noopener">${L.nav.github}</a>${langSwitch(L, `/${L.otherDir}`)}<button class="theme" id="theme" type="button" title="${esc(L.themeTitle)}">🌙</button></nav>
  </header>

  <section class="hero">
    <h1>${L.h1(m.games.length)}</h1>
    <p>${esc(L.tagline)}${L.en ? ' ' : '。'}${esc(L.heroLine)}</p>
    ${L.taglineAlt ? `<p class="en">${esc(L.taglineAlt)}</p>` : ''}
    <div class="pills">
      ${L.pills(m.games.length, CATS.length, m.games.filter(g => g.kind === '3D').length).map(t => `<span>${t}</span>`).join('')}
    </div>
  </section>
</div>

<div class="catbar" id="games">
  <div class="wrap row">
    <div class="chips" id="chips">
      <a class="chip on" data-cat="all" href="#games">${esc(L.all)} <b>${m.games.length}</b></a>${CATS.map(c => `
      <a class="chip" data-cat="${c.id}" href="#cat-${c.id}">${esc(catName(L, c))} <b>${m.games.filter(g => g.cat === c.id).length}</b></a>`).join('')}
    </div>
    <label class="search">🔍<input id="q" type="search" placeholder="${esc(L.searchPh)}" autocomplete="off"></label>
    <button class="lucky" id="lucky" type="button" title="${esc(L.luckyTitle)}">🎲 <span>${esc(L.lucky)}</span></button>
  </div>
</div>

<div class="wrap">
  <main id="list">${sections}
    <div class="empty" id="empty">${esc(L.empty)}</div>
  </main>

  <section id="about" class="about">
    <div>
      <h3>${esc(L.aboutH)}</h3>
      ${L.about.map(p => `<p>${esc(p)}</p>`).join('\n      ')}
    </div>
    <div>
      <h3>${esc(L.familyH)}</h3>
      <ul>${S.family.map(f => `
        <li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a><span>${esc(pick(L, f, 'desc'))}</span></li>`).join('')}
        <li><a href="${esc(S.github)}" target="_blank" rel="noopener">github.com/q3579338</a><span>${esc(L.allRepos)}</span></li>
      </ul>
    </div>
  </section>

  <footer>
    <span>© ${YEAR} satloot · ${esc(S.domain)}</span>
    <span>${langSwitch(L, `/${L.otherDir}`, 'lang')} · <a href="${esc(S.github)}" target="_blank" rel="noopener">GitHub</a> · <a href="/games.json">games.json</a> · <a href="/sitemap.xml">sitemap</a></span>
  </footer>
</div>
<script>
(function(){
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  // theme
  var root=document.documentElement, tb=$('#theme');
  function syncTheme(){ tb.textContent = root.getAttribute('data-theme')==='dark' ? '☀️' : '🌙'; }
  tb.addEventListener('click',function(){ var d=root.getAttribute('data-theme')==='dark'; if(d) root.removeAttribute('data-theme'); else root.setAttribute('data-theme','dark'); try{localStorage.setItem('gh:theme', d?'light':'dark')}catch(e){} syncTheme(); });
  syncTheme();
  // category filter + search
  var chips=$$('.chip'), cats=$$('.cat'), cards=$$('.card'), q=$('#q'), empty=$('#empty'), cur='all';
  function apply(){
    var kw=q.value.trim().toLowerCase(); var shown=0;
    cats.forEach(function(sec){
      var on = cur==='all' || sec.dataset.cat===cur; var n=0;
      $$('.card',sec).forEach(function(c){ var ok = on && (!kw || c.dataset.q.indexOf(kw)>=0 || c.textContent.toLowerCase().indexOf(kw)>=0); c.hidden=!ok; if(ok) n++; });
      sec.hidden = n===0; shown+=n;
    });
    empty.classList.toggle('show', shown===0);
    chips.forEach(function(ch){ ch.classList.toggle('on', ch.dataset.cat===cur); });
  }
  chips.forEach(function(ch){ ch.addEventListener('click',function(e){ e.preventDefault(); cur=ch.dataset.cat; apply(); try{history.replaceState(null,'', cur==='all' ? '#games' : '#cat-'+cur)}catch(x){} var top=$('#games').getBoundingClientRect().top+window.pageYOffset; window.scrollTo({top:top, behavior:'smooth'}); }); });
  q.addEventListener('input', apply);
  var h=(location.hash||'').replace('#','');
  if(h.indexOf('cat-')===0 && chips.some(function(c){return c.dataset.cat===h.slice(4)})){ cur=h.slice(4); apply(); }
  // random game
  $('#lucky').addEventListener('click',function(){ var pool=cards.filter(function(c){return !c.hidden}); if(!pool.length) pool=cards; var c=pool[Math.floor(Math.random()*pool.length)]; location.href=$('a.shot',c).getAttribute('href'); });
})();
</script>
</body>
</html>
`;
}

// ---------- /play/ 壳：顶栏 + iframe 装载游戏本体 + 换游戏面板 ----------
function playPage(L) {
  // 壳里只嵌当前语言的字段，体积小、脚本里也不混两种文案
  const games = m.games.map(g => ({
    id: g.id, title: pick(L, g, 'title'), titleAlt: L.en ? '' : (g.titleEn || ''), kind: g.kind, cat: g.cat,
    controls: pick(L, g, 'controls'), repo: g.repo || null, public: !!g.public, file: `/g/${g.id}/index.html`,
  }));
  const cats = CATS.map(c => ({ id: c.id, name: catName(L, c) }));
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${esc(L.frameTitle)} · ${esc(L.siteTitle)}</title>
<meta name="robots" content="noindex">
<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/play/">
<link rel="alternate" hreflang="en" href="${ORIGIN}/en/play/">
<meta property="og:locale" content="${L.ogLocale}">
<link rel="icon" href="${FAVICON}">
<meta name="theme-color" content="#0a0c14">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;overscroll-behavior:none;font:14px/1 ${FONT};color:#e8ecf5}
#frame{position:fixed;inset:0;width:100%;height:100%;border:0;display:block;background:#000}
#bar{position:fixed;top:0;left:0;right:0;height:46px;display:flex;align-items:center;gap:8px;padding:0 10px;
  background:rgba(10,12,20,.93);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08);
  transition:transform .22s ease;z-index:10;padding-top:env(safe-area-inset-top)}
#bar.hide{transform:translateY(calc(-100% - 2px))}
#bar a,#bar button{color:#e8ecf5;background:none;border:0;font:inherit;cursor:pointer;padding:8px 10px;border-radius:8px;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
#bar a:hover,#bar button:hover{background:rgba(255,255,255,.08)}
#bar .back{color:#ffd166;font-weight:700}
#bar .ttl{font-weight:800;font-size:15px;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#bar .ttl small{color:#8b93a7;font-weight:500;font-size:11.5px;letter-spacing:.4px;text-transform:uppercase;margin-left:8px}
#bar .sp{flex:1}
#bar a.lang{font-weight:700;font-size:12px;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:4px 9px;margin-left:2px}
#handle{position:fixed;top:0;left:50%;transform:translateX(-50%);width:72px;height:18px;border-radius:0 0 10px 10px;background:rgba(10,12,20,.78);
  z-index:9;display:flex;align-items:center;justify-content:center;color:#aab;font-size:11px;cursor:pointer;user-select:none;opacity:.75;transition:opacity .2s}
#handle:hover{opacity:1}
#handle.hide{display:none}
#help{position:fixed;top:46px;right:10px;max-width:min(92vw,420px);background:rgba(14,17,28,.96);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;z-index:11;line-height:1.55;color:#c9d0de;font-size:13.5px;display:none}
#help.show{display:block}
#help b{color:#ffd166}
#switch{position:fixed;top:46px;left:10px;width:min(92vw,360px);max-height:calc(100vh - 70px);overflow:auto;background:rgba(14,17,28,.97);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:8px;z-index:11;display:none}
#switch.show{display:block}
#switch h4{margin:8px 8px 4px;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase;color:#8b93a7;font-weight:700}
#switch a{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;color:#e8ecf5;text-decoration:none;font-size:13.5px}
#switch a:hover{background:rgba(255,255,255,.08)}
#switch a.cur{background:rgba(255,209,102,.14);color:#ffd166}
#switch a img{width:56px;height:35px;object-fit:cover;border-radius:5px;background:#000;flex:none}
#switch a small{color:#8b93a7;font-size:11px;margin-left:auto;white-space:nowrap}
#nogame{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#8b93a7}
#nogame a{color:#ffd166}
@media (max-width:560px){#bar .ttl small,#bar .lbl{display:none}#bar a,#bar button{padding:8px 8px}}
</style>
</head>
<body>
<iframe id="frame" title="${esc(L.frameTitle)}" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>
<div id="bar">
  <a class="back" href="/${L.dir}">${esc(L.back)}</a>
  <button id="btnSwitch" type="button" title="${esc(L.switchTitle)}">🎮 <span class="lbl">${esc(L.switchLbl)}</span></button>
  <a href="/${L.dir}hall/" title="${esc(L.hallLbl)}">🏆 <span class="lbl">${esc(L.hallLbl)}</span></a>
  <span class="ttl" id="ttl"></span>
  <span class="sp"></span>
  <button id="btnHelp" type="button" title="${esc(L.helpTitle)}">❔ <span class="lbl">${esc(L.helpLbl)}</span></button>
  <button id="btnFs" type="button" title="${esc(L.fsLbl)}">⛶ <span class="lbl">${esc(L.fsLbl)}</span></button>
  <a id="raw" href="#" target="_blank" rel="noopener" title="${esc(L.rawTitle)}">↗ <span class="lbl">${esc(L.rawLbl)}</span></a>
  <a id="srcA" href="#" target="_blank" rel="noopener" style="display:none">${esc(L.srcLbl)}</a>
  ${langSwitch(L, `/${L.otherDir}play/`, 'lang').replace('<a ', '<a id="langSw" ')}
</div>
<div id="handle" title="${esc(L.handleTitle)}">⌄</div>
<div id="help"></div>
<div id="switch"></div>
<div id="nogame"><div>${esc(L.nogame)}</div><a href="/${L.dir}">${esc(L.backHome)}</a><a class="lang" href="/${L.otherDir}play/" hreflang="${L.otherHtmlLang}" lang="${L.otherHtmlLang}" onclick="try{localStorage.setItem('gh:lang','${L.other}')}catch(e){}">${L.otherLabel}</a></div>
<script>
const GAMES = ${JSON.stringify(games)};
const CATS = ${JSON.stringify(cats)};
const DIR = ${JSON.stringify('/' + L.dir)};
const SITE_TITLE = ${JSON.stringify(L.siteTitle)};
const TXT = ${JSON.stringify({ help: L.helpLbl, note: L.helpNote, fs: L.fsLbl, fsExit: L.fsExit })};
const id = new URLSearchParams(location.search).get('g');
const g = GAMES.find(x => x.id === id);
const $ = s => document.querySelector(s);
const frame = $('#frame'), bar = $('#bar'), handle = $('#handle'), help = $('#help'), sw = $('#switch');
// language switch keeps ?g= so it lands on the same game in the other language
document.querySelectorAll('a.lang').forEach(a => { a.href = a.getAttribute('href') + location.search; });
if (!g) {
  $('#nogame').style.display = 'flex'; frame.remove(); bar.remove(); handle.remove();
} else {
  document.title = g.title + ' · ' + SITE_TITLE;
  $('#ttl').innerHTML = esc(g.title) + (g.titleAlt ? '<small>' + esc(g.titleAlt) + '</small>' : '');
  $('#raw').href = g.file;
  if (g.public && g.repo) { const a = $('#srcA'); a.href = 'https://github.com/' + g.repo; a.style.display = ''; }
  help.innerHTML = '<b>' + esc(TXT.help) + '</b><br>' + esc(g.controls) + '<br><span style="color:#5f677a;font-size:12px">' + esc(TXT.note) + '</span>';
  sw.innerHTML = CATS.map(c => { const gs = GAMES.filter(x => x.cat === c.id); return gs.length ? '<h4>' + esc(c.name) + '</h4>' + gs.map(x => '<a href="' + DIR + 'play/?g=' + x.id + '"' + (x.id === g.id ? ' class="cur"' : '') + '><img src="/shots/' + x.id + '-s.jpg" alt="" loading="lazy">' + esc(x.title) + '<small>' + esc(x.kind) + '</small></a>').join('') : ''; }).join('');
  frame.src = g.file;

  let t = 0;
  const show = () => { bar.classList.remove('hide'); handle.classList.add('hide'); clearTimeout(t); t = setTimeout(hide, 3500); };
  const hide = () => { bar.classList.add('hide'); handle.classList.remove('hide'); help.classList.remove('show'); sw.classList.remove('show'); try { frame.contentWindow.focus(); } catch (e) {} };
  bar.addEventListener('mouseenter', () => clearTimeout(t));
  bar.addEventListener('mouseleave', () => { if (!sw.classList.contains('show') && !help.classList.contains('show')) t = setTimeout(hide, 1200); });
  handle.addEventListener('click', show);
  handle.addEventListener('mouseenter', show);
  $('#btnHelp').addEventListener('click', () => { help.classList.toggle('show'); sw.classList.remove('show'); clearTimeout(t); });
  $('#btnSwitch').addEventListener('click', () => { sw.classList.toggle('show'); help.classList.remove('show'); clearTimeout(t); });
  $('#btnFs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => { $('#btnFs').querySelector('.lbl').textContent = document.fullscreenElement ? TXT.fsExit : TXT.fs; });
  frame.addEventListener('load', () => {
    try {
      const d = frame.contentDocument;
      d.addEventListener('pointerdown', () => { if (!bar.classList.contains('hide')) hide(); }, { passive: true });
      d.addEventListener('mousemove', e => { if (e.clientY <= 4) show(); }, { passive: true });
      frame.contentWindow.focus();
    } catch (e) {}
    t = setTimeout(hide, 2500);
  });
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
</script>
</body>
</html>
`;
}

// ---------- /hall/ 英雄榜：静态页 + 客户端拉 /api/scores?all=1 ----------
function hallPage(L) {
  const hallGames = m.games.filter(g => g.boards && g.boards.length);
  const T = g => pick(L, g, 'title');
  const url = `${ORIGIN}/${L.dir}hall/`;
  const site = `${ORIGIN}/${L.dir}`;
  const title = `${L.hallTitle} · ${L.siteTitle}`;
  const desc = L.hallMeta(hallGames.map(T));
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    ORG,
    { '@type': 'WebSite', '@id': `${site}#website`, url: site, name: L.siteTitle, inLanguage: L.htmlLang, publisher: { '@id': ORG_ID } },
    { '@type': 'WebPage', '@id': url, url, name: title, description: desc, inLanguage: L.htmlLang, isPartOf: { '@id': `${site}#website` }, primaryImageOfPage: { '@type': 'ImageObject', url: OG_IMG, width: 1200, height: 630 } },
    { '@type': 'ItemList', name: title, url, inLanguage: L.htmlLang, numberOfItems: hallGames.length,
      itemListElement: hallGames.map((g, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'VideoGame', name: T(g), url: `${site}play/?g=${g.id}`, image: `${ORIGIN}/shots/${g.id}.jpg` } })) },
  ] };
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${altLinks('hall/')}
<link rel="icon" href="${FAVICON}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(L.siteTitle)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(L.hallSub)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.ogLocale}">
<meta property="og:locale:alternate" content="${L.ogLocaleAlt}">
<meta property="og:image" content="${OG_IMG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(L.siteTitle)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(L.hallSub)}">
<meta name="twitter:image" content="${OG_IMG}">
<script type="application/ld+json">${ld(jsonld)}</script>
${THEME_BOOT}
<style>
:root{--bg:#ffffff;--card:#ffffff;--card2:#f1f3f8;--line:#e6e9f0;--line2:#cfd5e1;--text:#141826;--muted:#5b647a;--dim:#8a93a8;--accent:#ff6a3d;--accent2:#d98f00;--chipbg:#fff;--shadow:0 12px 30px -18px rgba(20,24,38,.28);--gold:#ffd166;--silver:#cfd6e4;--bronze:#e0a672}
[data-theme=dark]{--bg:#0b0e17;--card:#151a28;--card2:#1b2133;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.18);--text:#e8ecf5;--muted:#8b93a7;--dim:#5f677a;--accent:#ff7a59;--accent2:#ffd166;--chipbg:rgba(255,255,255,.04);--shadow:0 18px 40px -22px rgba(0,0,0,.7)}
*{box-sizing:border-box}html{color-scheme:light}[data-theme=dark]{color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 ${FONT}}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px}.brand img{width:28px;height:28px}
.brand small{font-weight:500;color:var(--muted);font-size:12px;letter-spacing:.6px;text-transform:uppercase;margin-left:4px}
nav{display:flex;align-items:center}nav a{color:var(--muted);font-size:14px;margin-left:14px;padding:6px 0;border-bottom:1px solid transparent}nav a:hover{color:var(--text);border-bottom-color:var(--line2)}
nav a.lang-switch{padding:4px 11px;border:1px solid var(--line);border-radius:999px;background:var(--chipbg);font-weight:700;font-size:12.5px;color:var(--text)}
nav a.lang-switch:hover{border-color:var(--accent);color:var(--accent)}
.theme{margin-left:14px;border:1px solid var(--line);background:var(--chipbg);color:var(--muted);border-radius:999px;width:34px;height:34px;cursor:pointer;font-size:16px}
h1{margin:22px 0 6px;font-size:clamp(26px,4vw,38px);font-weight:800;letter-spacing:-.3px}
h1 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--muted);margin:0 0 22px;font-size:15px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px;padding-bottom:40px}
.g{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column}
.g .hd{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line)}
.g .hd img{width:64px;height:40px;object-fit:cover;border-radius:8px;background:#000;flex:none}
.g .hd h2{margin:0;font-size:17px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.g .hd a.play{font-size:12.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--accent),#ff9a76);border-radius:8px;padding:6px 10px;white-space:nowrap}
.tabs{display:flex;gap:6px;padding:10px 14px 0;flex-wrap:wrap}.tabs button{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--chipbg);color:var(--muted);border-radius:999px;padding:4px 10px;cursor:pointer}.tabs button.on{background:var(--accent);border-color:var(--accent);color:#fff}
ol{list-style:none;margin:0;padding:8px 14px 12px}ol li{display:flex;align-items:center;gap:10px;padding:6px 4px;border-bottom:1px dashed var(--line);font-size:14px}ol li:last-child{border-bottom:0}
.rk{width:24px;height:24px;border-radius:50%;background:var(--card2);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex:none;color:var(--muted)}
li:nth-child(1) .rk{background:var(--gold);color:#1a1200}li:nth-child(2) .rk{background:var(--silver);color:#1a1200}li:nth-child(3) .rk{background:var(--bronze);color:#1a1200}
.nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.sc{font-weight:800;white-space:nowrap}.dt{color:var(--dim);font-size:11.5px;white-space:nowrap}
.empty{color:var(--dim);font-size:13px;padding:12px 4px}
.note{color:var(--dim);font-size:13px;padding:0 0 30px}
footer{padding:20px 0 40px;color:var(--dim);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}footer a{color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/${L.dir}"><img src="${FAVICON}" alt="">${esc(L.siteTitle)}<small>${esc(S.domain)}</small></a>
    <nav><a href="/${L.dir}#games">${L.nav.games}</a><a href="/${L.dir}hall/">${L.nav.hall}</a><a href="${esc(S.github)}" target="_blank" rel="noopener">${L.nav.github}</a>${langSwitch(L, `/${L.otherDir}hall/`)}<button class="theme" id="theme" type="button" title="${esc(L.themeTitle)}">🌙</button></nav>
  </header>
  <h1>🏆 <em>${esc(L.hallTitle)}</em></h1>
  <p class="sub">${esc(L.hallSub)}</p>
  <div class="grid" id="grid">${hallGames.map(g => `
    <section class="g" data-game="${g.id}">
      <div class="hd"><img src="/shots/${g.id}-s.jpg" alt=""><h2>${esc(T(g))}</h2><a class="play" href="/${L.dir}play/?g=${g.id}">${L.goPlay}</a></div>
      ${g.boards.length > 1 ? `<div class="tabs">${g.boards.map((b, i) => `<button data-k="${esc(b.key)}"${i ? '' : ' class="on"'}>${esc(pick(L, b, 'label'))}</button>`).join('')}</div>` : ''}
      <ol data-k="${esc(g.boards[0].key)}"><li class="empty">${esc(L.loading)}</li></ol>
    </section>`).join('')}
  </div>
  <p class="note">${esc(L.hallNote)}</p>
  <footer><span>© ${YEAR} satloot · ${esc(S.domain)}</span><span>${langSwitch(L, `/${L.otherDir}hall/`, 'lang')} · <a href="/${L.dir}">${esc(L.backHome)}</a></span></footer>
</div>
<script>
(function(){
  var GAMES=${JSON.stringify(hallGames.map(g => ({ id: g.id, boards: g.boards.map(b => ({ key: b.key, fmt: b.fmt })) })))};
  var TXT=${JSON.stringify({ sec: L.fmtSec, moves: L.fmtMoves, pts: L.fmtPts, unavailable: L.unavailable, noEntries: L.noEntries })};
  var $=function(s,r){return (r||document).querySelector(s)};
  var root=document.documentElement, tb=$('#theme'); function syncTheme(){ tb.textContent = root.getAttribute('data-theme')==='dark' ? '☀️' : '🌙'; }
  tb.addEventListener('click',function(){ var d=root.getAttribute('data-theme')==='dark'; if(d) root.removeAttribute('data-theme'); else root.setAttribute('data-theme','dark'); try{localStorage.setItem('gh:theme', d?'light':'dark')}catch(e){} syncTheme(); }); syncTheme();
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function mmss(v){v=Math.round(v);return Math.floor(v/60)+':'+String(v%60).padStart(2,'0')}
  function fmt(kind,v,e){ if(kind==='sec') return v+TXT.sec; if(kind==='mmss') return mmss(v); if(kind==='moves') return Math.floor(v)+TXT.moves+(e&&e.meta&&e.meta.time!=null?' · '+mmss(e.meta.time):''); return v+TXT.pts; }
  function date(at){var d=new Date(at);return (d.getMonth()+1)+'/'+d.getDate()}
  var DATA=null;
  function render(sec, g, k){ var b=g.boards.filter(function(x){return x.key===k})[0]; var ol=$('ol',sec); ol.dataset.k=k; var d=DATA&&DATA[g.id]&&DATA[g.id][k]; if(!d){ol.innerHTML='<li class="empty">'+esc(TXT.unavailable)+'</li>';return;} ol.innerHTML = d.list.length ? d.list.map(function(e){return '<li><span class="rk">'+e.rank+'</span><span class="nm">'+esc(e.name)+'</span><span class="sc">'+esc(fmt(b.fmt,e.score,e))+'</span><span class="dt">'+date(e.at)+'</span></li>'}).join('') : '<li class="empty">'+esc(TXT.noEntries)+'</li>'; }
  fetch('/api/scores?all=1&limit=5',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){ DATA=j.games||{}; }).catch(function(){ DATA=null; }).then(function(){
    GAMES.forEach(function(g){ var sec=document.querySelector('[data-game="'+g.id+'"]'); render(sec,g,g.boards[0].key);
      sec.querySelectorAll('.tabs button').forEach(function(btn){ btn.addEventListener('click',function(){ sec.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x===btn)}); render(sec,g,btn.dataset.k); }); });
    });
  });
})();
</script>
</body>
</html>
`;
}

// ---------- 按语言各出一份 ----------
const sizes = [];
for (const L of [LOCALES.zh, LOCALES.en]) {
  const base = path.join(SITE, L.dir);
  fs.mkdirSync(path.join(base, 'play'), { recursive: true });
  fs.mkdirSync(path.join(base, 'hall'), { recursive: true });
  const idx = indexPage(L), ply = playPage(L), hal = hallPage(L);
  fs.writeFileSync(path.join(base, 'index.html'), idx);
  fs.writeFileSync(path.join(base, 'play', 'index.html'), ply);
  fs.writeFileSync(path.join(base, 'hall', 'index.html'), hal);
  sizes.push(`/${L.dir}index.html ${(idx.length / 1024).toFixed(0)} KB, /${L.dir}play/ ${(ply.length / 1024).toFixed(0)} KB, /${L.dir}hall/ ${(hal.length / 1024).toFixed(0)} KB`);
}

fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /play/\nDisallow: /en/play/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
const smAlt = sub => `<xhtml:link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/${sub}"/><xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/en/${sub}"/><xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/${sub}"/>`;
const smUrl = (loc, sub, pri) => `  <url><loc>${loc}</loc>${smAlt(sub)}<lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${pri}</priority></url>`;
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${smUrl(`${ORIGIN}/`, '', '1.0')}
${smUrl(`${ORIGIN}/en/`, '', '0.9')}
${smUrl(`${ORIGIN}/hall/`, 'hall/', '0.6')}
${smUrl(`${ORIGIN}/en/hall/`, 'hall/', '0.5')}
</urlset>
`);

console.log(`built ${sizes.join(' | ')}; games.json, robots.txt, sitemap.xml — ${m.games.length} games in ${CATS.length} categories, zh-CN + en`);
