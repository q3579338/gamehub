// 由 games.json + upstream/meta.json 生成 site/index.html、site/play/index.html、site/games.json、robots.txt、sitemap.xml
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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kb = n => n >= 1024 * 1024 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';
const ymd = iso => iso ? iso.slice(0, 10) : '';

// 公开清单（play 壳与第三方都用得上）
const pub = m.games.map(g => ({
  id: g.id, title: g.title, titleEn: g.titleEn, desc: g.desc, descEn: g.descEn, kind: g.kind, engine: g.engine,
  tags: g.tags, controls: g.controls, repo: g.repo, public: !!g.public,
  url: `/play/?g=${g.id}`, file: `/g/${g.id}/index.html`, shot: `/shots/${g.id}.jpg`,
  size: meta[g.id]?.size ?? null, updated: ymd(meta[g.id]?.date),
}));
fs.writeFileSync(path.join(SITE, 'games.json'), JSON.stringify({ site: { domain: S.domain, title: S.title }, games: pub }, null, 2));

const FONT = `"PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Noto Sans SC",-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="18" width="56" height="30" rx="12" fill="#ff7a59"/><rect x="14" y="27" width="12" height="4" rx="2" fill="#0b0e17"/><rect x="18" y="23" width="4" height="12" rx="2" fill="#0b0e17"/><circle cx="44" cy="29" r="3" fill="#0b0e17"/><circle cx="50" cy="35" r="3" fill="#0b0e17"/></svg>`)}`;

const card = (g, i) => `
      <article class="card${g.featured ? ' featured' : ''}" data-kind="${esc(g.kind)}">
        <a class="shot" href="/play/?g=${g.id}" aria-label="开始游戏：${esc(g.title)}">
          <img src="/shots/${g.id}.jpg" srcset="/shots/${g.id}-s.jpg 600w, /shots/${g.id}.jpg 1200w" sizes="(max-width: 720px) 100vw, ${g.featured ? '66vw' : '33vw'}" width="1200" height="750" alt="${esc(g.title)} 游戏画面"${i ? ' loading="lazy"' : ' fetchpriority="high"'}>
          <span class="kind">${esc(g.kind)} · ${esc(g.engine)}</span>
          <span class="play-hint">▶ 开始游戏</span>
        </a>
        <div class="body">
          <h2><a href="/play/?g=${g.id}">${esc(g.title)}</a></h2>
          <div class="en">${esc(g.titleEn)}</div>
          <p class="desc">${esc(g.desc)}</p>
          <p class="desc-en">${esc(g.descEn)}</p>
          <ul class="tags">${g.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <div class="foot">
            <a class="btn" href="/play/?g=${g.id}">▶ 开始游戏</a>
            <span class="meta">${meta[g.id] ? `${kb(meta[g.id].size)} · 更新于 ${ymd(meta[g.id].date)}` : ''}</span>
            ${g.public
              ? `<a class="src" href="https://github.com/${esc(g.repo)}" target="_blank" rel="noopener">源码 ↗</a>`
              : `<span class="src locked" title="仓库暂未公开">${esc(g.repo.split('/')[1])}</span>`}
          </div>
        </div>
      </article>`;

const jsonld = {
  '@context': 'https://schema.org', '@type': 'ItemList', name: S.title, url: ORIGIN + '/',
  itemListElement: m.games.map((g, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: { '@type': 'VideoGame', name: g.title, alternateName: g.titleEn, url: `${ORIGIN}/play/?g=${g.id}`, image: `${ORIGIN}/shots/${g.id}.jpg`,
      description: g.desc, gamePlatform: 'Web browser', applicationCategory: 'Game', operatingSystem: 'Any', inLanguage: 'zh-CN',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' } },
  })),
};

const index = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(S.title)} · ${esc(S.tagline)}</title>
<meta name="description" content="${esc(S.tagline)}：${m.games.map(g => g.title).join('、')}。${esc(S.taglineEn)}">
<link rel="canonical" href="${ORIGIN}/">
<link rel="icon" href="${FAVICON}">
<meta name="theme-color" content="#0b0e17">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.title)}">
<meta property="og:title" content="${esc(S.title)} · ${esc(S.titleEn)}">
<meta property="og:description" content="${esc(S.tagline)}">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/shots/${(m.games.find(g => g.featured) || m.games[0]).id}.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>
:root{--bg:#0b0e17;--bg2:#10141f;--card:#151a28;--card2:#1b2133;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.16);
  --text:#e8ecf5;--muted:#8b93a7;--dim:#5f677a;--accent:#ff7a59;--accent2:#ffd166;--accent-ink:#1a0f0a;--r:16px}
*{box-sizing:border-box}
html{color-scheme:dark;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 ${FONT};
  background-image:radial-gradient(900px 420px at 15% -10%,rgba(255,122,89,.16),transparent 60%),radial-gradient(700px 380px at 90% 0%,rgba(255,209,102,.10),transparent 60%);
  background-repeat:no-repeat}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;letter-spacing:.2px}
.brand img{width:28px;height:28px;display:block}
.brand small{font-weight:500;color:var(--muted);font-size:12px;letter-spacing:.6px;text-transform:uppercase;margin-left:4px}
nav a{color:var(--muted);font-size:14px;margin-left:18px;padding:6px 0;border-bottom:1px solid transparent}
nav a:hover{color:var(--text);border-bottom-color:var(--line2)}
.hero{padding:34px 0 26px}
.hero h1{margin:0 0 10px;font-size:clamp(28px,4.6vw,44px);line-height:1.15;letter-spacing:-.3px;font-weight:800}
.hero h1 em{font-style:normal;background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{margin:0;color:var(--muted);max-width:720px;font-size:16px}
.hero p.en{font-size:13.5px;color:var(--dim);margin-top:4px}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.pills span{font-size:12.5px;color:var(--muted);border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:999px;padding:5px 11px}
.pills span b{color:var(--accent2);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:22px;padding:12px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.card:hover{transform:translateY(-3px);border-color:rgba(255,122,89,.45);box-shadow:0 18px 40px -22px rgba(255,122,89,.35)}
.shot{position:relative;display:block;aspect-ratio:16/10;background:#000;overflow:hidden}
.shot img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}
.card:hover .shot img{transform:scale(1.035)}
.kind{position:absolute;left:12px;top:12px;font-size:11.5px;font-weight:700;letter-spacing:.4px;color:#fff;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 9px}
.play-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;background:rgba(0,0,0,.28);opacity:0;transition:opacity .2s}
.play-hint::before{content:"";position:absolute;width:76px;height:76px;border-radius:50%;background:rgba(255,122,89,.9);z-index:-1;box-shadow:0 10px 30px rgba(255,122,89,.5)}
.card:hover .play-hint{opacity:1}
.body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
.body h2{margin:0;font-size:19px;line-height:1.3;font-weight:800}
.body h2 a:hover{color:var(--accent2)}
.en{color:var(--dim);font-size:12px;letter-spacing:.5px;text-transform:uppercase}
.desc{margin:6px 0 0;color:var(--muted);font-size:14px}
.desc-en{margin:0;color:var(--dim);font-size:12.5px;line-height:1.5}
.tags{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.tags li{font-size:12px;color:var(--muted);background:var(--card2);border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.foot{display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:14px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,var(--accent),#ff9a76);color:var(--accent-ink);font-weight:800;font-size:14px;border-radius:10px;padding:9px 16px;box-shadow:0 8px 20px -10px rgba(255,122,89,.8)}
.btn:hover{filter:brightness(1.06)}
.meta{color:var(--dim);font-size:12px}
.src{margin-left:auto;font-size:12.5px;color:var(--muted)}
.src:hover{color:var(--text)}
.src.locked{color:var(--dim);cursor:default}
.src.locked::before{content:"🔒 ";font-size:11px}
.featured .body h2{font-size:22px}
@media (min-width:720px){.featured{grid-column:span 2}.featured .shot{aspect-ratio:2/1}}
@media (max-width:480px){.grid{grid-template-columns:1fr;gap:16px}.body{padding:14px 15px 16px}nav a{margin-left:12px}.brand small{display:none}}
.about{margin:44px 0 0;padding:28px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:1.4fr 1fr;gap:36px}
.about h3{margin:0 0 10px;font-size:16px}
.about p{margin:0 0 10px;color:var(--muted);font-size:14px}
.about ul{list-style:none;margin:0;padding:0}
.about li{display:flex;gap:10px;align-items:baseline;padding:7px 0;border-bottom:1px dashed var(--line);font-size:14px}
.about li a{color:var(--text);font-weight:600;white-space:nowrap}
.about li a:hover{color:var(--accent2)}
.about li span{color:var(--dim);font-size:13px}
@media (max-width:720px){.about{grid-template-columns:1fr;gap:20px}}
footer{padding:36px 0 40px;color:var(--dim);font-size:13px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
footer a{color:var(--muted)}footer a:hover{color:var(--text)}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="${FAVICON}" alt="">${esc(S.title)}<small>${esc(S.domain)}</small></a>
    <nav><a href="#games">游戏</a><a href="#about">关于</a><a href="${esc(S.github)}" target="_blank" rel="noopener">GitHub ↗</a></nav>
  </header>

  <section class="hero">
    <h1>GitHub 上的小游戏，<em>打开即玩</em></h1>
    <p>${esc(S.tagline)}。每个游戏都是一个 HTML 文件，程序化生成画面与音效，没有任何外部资源；存档只存在你自己的浏览器里。</p>
    <p class="en">${esc(S.taglineEn)}</p>
    <div class="pills">
      <span><b>${m.games.length}</b> 款游戏</span><span><b>${m.games.filter(g => g.kind === '3D').length}</b> 款 3D · Three.js</span><span>单文件 · 零依赖</span><span>键盘 + 触屏</span><span>手机也能玩</span><span>免费 · 无广告 · 不登录</span>
    </div>
  </section>

  <main id="games" class="grid">${m.games.map(card).join('\n')}
  </main>

  <section id="about" class="about">
    <div>
      <h3>关于这个站</h3>
      <p>这里收录我在 GitHub 上写的小游戏。3D 的用 Three.js，2D 的用 Canvas，全部是程序化生成：没有图片、没有模型、没有字体文件，整个游戏就是一个 HTML。</p>
      <p>存档（金币、装扮、关卡进度、最高分）走浏览器 localStorage，只存在你自己的设备上，本站没有后端、不收集任何数据。换浏览器或清缓存会丢档。</p>
      <p>3D 游戏在手机上会比较吃性能，卡的话可以在游戏内暂停菜单关掉后处理特效；电脑上用 Chrome / Edge 体验最好。</p>
    </div>
    <div>
      <h3>satloot 家族</h3>
      <ul>${S.family.map(f => `
        <li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a><span>${esc(f.desc)}</span></li>`).join('')}
        <li><a href="${esc(S.github)}" target="_blank" rel="noopener">github.com/q3579338</a><span>全部源码仓库</span></li>
      </ul>
    </div>
  </section>

  <footer>
    <span>© ${new Date().getFullYear()} satloot · ${esc(S.domain)}</span>
    <span><a href="${esc(S.github)}" target="_blank" rel="noopener">GitHub</a> · <a href="/games.json">games.json</a> · <a href="/sitemap.xml">sitemap</a></span>
  </footer>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(SITE, 'index.html'), index);

// ---------- /play/ 壳：顶栏 + iframe 装载游戏本体 ----------
const play = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${esc(S.title)}</title>
<meta name="robots" content="noindex">
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
#handle{position:fixed;top:0;left:50%;transform:translateX(-50%);width:72px;height:18px;border-radius:0 0 10px 10px;background:rgba(10,12,20,.78);
  z-index:9;display:flex;align-items:center;justify-content:center;color:#aab;font-size:11px;cursor:pointer;user-select:none;opacity:.75;transition:opacity .2s}
#handle:hover{opacity:1}
#handle.hide{display:none}
#help{position:fixed;top:46px;right:10px;max-width:min(92vw,420px);background:rgba(14,17,28,.96);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 14px;z-index:11;line-height:1.55;color:#c9d0de;font-size:13.5px;display:none}
#help.show{display:block}
#help b{color:#ffd166}
#nogame{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#8b93a7}
#nogame a{color:#ffd166}
@media (max-width:560px){#bar .ttl small,#bar .lbl{display:none}#bar a,#bar button{padding:8px 8px}}
</style>
</head>
<body>
<iframe id="frame" title="游戏" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>
<div id="bar">
  <a class="back" href="/">← 游戏厅</a>
  <span class="ttl" id="ttl"></span>
  <span class="sp"></span>
  <button id="btnHelp" type="button" title="操作说明">🎮 <span class="lbl">操作</span></button>
  <button id="btnFs" type="button" title="全屏">⛶ <span class="lbl">全屏</span></button>
  <a id="raw" href="#" target="_blank" rel="noopener" title="在新窗口直接打开游戏文件">↗ <span class="lbl">新窗口</span></a>
  <a id="srcA" href="#" target="_blank" rel="noopener" style="display:none">源码</a>
</div>
<div id="handle" title="显示工具栏">⌄</div>
<div id="help"></div>
<div id="nogame"><div>没有这个游戏。</div><a href="/">← 回游戏厅</a></div>
<script>
const GAMES = ${JSON.stringify(pub)};
const id = new URLSearchParams(location.search).get('g');
const g = GAMES.find(x => x.id === id);
const $ = s => document.querySelector(s);
const frame = $('#frame'), bar = $('#bar'), handle = $('#handle'), help = $('#help');
if (!g) {
  $('#nogame').style.display = 'flex'; frame.remove(); bar.remove(); handle.remove();
} else {
  document.title = g.title + ' · ${esc(S.title)}';
  $('#ttl').innerHTML = esc(g.title) + '<small>' + esc(g.titleEn) + '</small>';
  $('#raw').href = g.file;
  if (g.public) { const a = $('#srcA'); a.href = 'https://github.com/' + g.repo; a.style.display = ''; }
  help.innerHTML = '<b>操作</b><br>' + esc(g.controls) + '<br><span style="color:#5f677a;font-size:12px">存档在本机浏览器 · Esc 一般为暂停 · 鼠标贴到最顶边或点顶部小把手可呼出工具栏</span>';
  frame.src = g.file;

  let t = 0;
  const show = () => { bar.classList.remove('hide'); handle.classList.add('hide'); clearTimeout(t); t = setTimeout(hide, 3500); };
  const hide = () => { bar.classList.add('hide'); handle.classList.remove('hide'); help.classList.remove('show'); try { frame.contentWindow.focus(); } catch (e) {} };
  bar.addEventListener('mouseenter', () => clearTimeout(t));
  bar.addEventListener('mouseleave', () => { t = setTimeout(hide, 1200); });
  handle.addEventListener('click', show);
  handle.addEventListener('mouseenter', show);
  $('#btnHelp').addEventListener('click', () => { help.classList.toggle('show'); clearTimeout(t); });
  $('#btnFs').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange', () => { $('#btnFs').querySelector('.lbl').textContent = document.fullscreenElement ? '退出全屏' : '全屏'; });
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
fs.mkdirSync(path.join(SITE, 'play'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'play', 'index.html'), play);

fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /play/\nSitemap: ${ORIGIN}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);

console.log(`built site/index.html (${(index.length / 1024).toFixed(0)} KB), site/play/index.html (${(play.length / 1024).toFixed(0)} KB), games.json, robots.txt, sitemap.xml — ${m.games.length} games`);
