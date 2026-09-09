/* @lb-start */
/* 英雄榜客户端（由 tools/inject.mjs 注入到每个自制游戏，源文件 games/_shared/leaderboard.js，改这里再 node tools/inject.mjs） */
const LB = (() => {
  const API = '/api/scores', CAP = 20, NAME_KEY = 'gh:name';
  const enabled = /^https?:$/.test(location.protocol);
  const getName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } };
  const setName = n => { try { localStorage.setItem(NAME_KEY, n); } catch (e) {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `.lb-ov{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(8,10,20,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:"PingFang SC","Microsoft YaHei UI","Microsoft YaHei",-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.lb-panel{width:min(92vw,420px);max-height:86vh;overflow:auto;background:#161b2c;color:#e8ecf5;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px 14px;box-shadow:0 24px 70px -20px rgba(0,0,0,.8);position:relative}
.lb-panel h3{margin:0 0 4px;font-size:18px;font-weight:900;padding-right:36px}.lb-panel h3 small{color:#8b93a7;font-weight:500;font-size:12px;margin-left:8px}
.lb-x{position:absolute;right:10px;top:10px;width:30px;height:30px;border:0;border-radius:8px;background:rgba(255,255,255,.08);color:#e8ecf5;font-size:16px;cursor:pointer}
.lb-tabs{display:flex;gap:6px;margin:8px 0 10px;flex-wrap:wrap}.lb-tabs button{font:inherit;font-size:12.5px;font-weight:700;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#aab3c8;border-radius:999px;padding:5px 11px;cursor:pointer}.lb-tabs button.on{background:#ffd166;color:#1a1200;border-color:#ffd166}
.lb-list{list-style:none;margin:0;padding:0}.lb-list li{display:flex;align-items:center;gap:10px;padding:7px 6px;border-bottom:1px dashed rgba(255,255,255,.08);font-size:14px}.lb-list li:nth-child(1) .lb-rk{background:#ffd166;color:#1a1200}.lb-list li:nth-child(2) .lb-rk{background:#cfd6e4;color:#1a1200}.lb-list li:nth-child(3) .lb-rk{background:#d9a066;color:#1a1200}
.lb-rk{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.08);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:12.5px;flex:none}.lb-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.lb-sc{font-weight:800;white-space:nowrap}.lb-dt{color:#5f677a;font-size:11.5px;white-space:nowrap}
.lb-empty,.lb-note{color:#8b93a7;font-size:13px;text-align:center;padding:14px 0}.lb-list li.me{background:rgba(255,209,102,.12);border-radius:8px}
.lb-offer{margin:10px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.35);text-align:left;font-size:13.5px;line-height:1.5;color:inherit}
.lb-offer b{color:#d98f00}.lb-offer .row{display:flex;gap:8px;margin-top:8px}.lb-offer input{flex:1;min-width:0;font:inherit;font-size:14px;padding:8px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.4);background:rgba(255,255,255,.9);color:#111}
.lb-offer button{font:inherit;font-weight:800;font-size:13.5px;border:0;border-radius:8px;padding:8px 12px;background:#ffb703;color:#1a1200;cursor:pointer;white-space:nowrap}.lb-offer button[disabled]{opacity:.6;cursor:default}.lb-offer a{color:#d98f00;font-weight:700;cursor:pointer;text-decoration:underline}
.lb-offer .ok{color:#2a9d4a;font-weight:800}`;
  function ensureCss() { if (!document.getElementById('lb-css')) { const s = document.createElement('style'); s.id = 'lb-css'; s.textContent = CSS; document.head.appendChild(s); } }
  const fmtDate = at => { const d = new Date(at); return `${d.getMonth() + 1}/${d.getDate()}`; };
  async function fetchList(game, board, limit = CAP) { const r = await fetch(`${API}?game=${encodeURIComponent(game)}&board=${encodeURIComponent(board)}&limit=${limit}`, { cache: 'no-store' }); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }
  async function submit(game, board, name, score, meta) { const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game, board, name, score, meta }) }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.ok) throw new Error(j.error || ('http ' + r.status)); return j; }
  const qualifies = (list, dir, score) => list.length < CAP || (dir === 'desc' ? score > list[list.length - 1].score : score < list[list.length - 1].score);
  function renderList(ul, list, fmt, meId) {
    ul.innerHTML = list.length ? list.map(e => `<li${meId && e.id === meId ? ' class="me"' : ''}><span class="lb-rk">${e.rank}</span><span class="lb-nm">${esc(e.name)}</span><span class="lb-sc">${esc(fmt(e.score, e))}</span><span class="lb-dt">${fmtDate(e.at)}</span></li>`).join('') : '<li class="lb-empty">还没有人上榜，来当第一个！</li>';
  }
  // 弹出榜单：boards = [{key,label}]，fmt(score, entry) → 显示文本
  async function show(game, boards, fmt, title = '🏆 英雄榜') {
    if (!enabled) return alert('英雄榜需要在线打开（game.satloot.com）');
    ensureCss(); if (typeof boards === 'string') boards = [{ key: boards, label: '' }];
    const ov = document.createElement('div'); ov.className = 'lb-ov';
    ov.innerHTML = `<div class="lb-panel"><button class="lb-x" title="关闭">✕</button><h3>${esc(title)}<small>前 ${CAP} 名</small></h3>${boards.length > 1 ? `<div class="lb-tabs">${boards.map((b, i) => `<button data-k="${esc(b.key)}"${i ? '' : ' class="on"'}>${esc(b.label)}</button>`).join('')}</div>` : ''}<ul class="lb-list"><li class="lb-empty">加载中…</li></ul></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove(); ov.querySelector('.lb-x').onclick = close; ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); window.removeEventListener('keydown', onKey, true); } }; window.addEventListener('keydown', onKey, true);
    const ul = ov.querySelector('.lb-list');
    const loadBoard = async k => { ul.innerHTML = '<li class="lb-empty">加载中…</li>'; try { const j = await fetchList(game, k); renderList(ul, j.list, fmt); } catch (e) { ul.innerHTML = '<li class="lb-empty">榜单暂时打不开</li>'; } };
    ov.querySelectorAll('.lb-tabs button').forEach(b => b.onclick = () => { ov.querySelectorAll('.lb-tabs button').forEach(x => x.classList.toggle('on', x === b)); loadBoard(b.dataset.k); });
    loadBoard(boards[0].key);
  }
  // 在结算面板里给出「留名上榜」：host 为容器元素
  function offer(host, { game, board, score, meta, fmt, boards, title }) {
    if (!host) return; host.innerHTML = '';
    if (!enabled || !(score > 0)) return;
    ensureCss(); const box = document.createElement('div'); box.className = 'lb-offer'; box.innerHTML = '🏆 英雄榜 · 查询中…'; host.appendChild(box);
    const showLink = () => `<a class="lb-view">查看榜单</a>`;
    const bind = () => { const a = box.querySelector('.lb-view'); if (a) a.onclick = () => show(game, boards || board, fmt, title); };
    fetchList(game, board).then(j => {
      if (!qualifies(j.list, j.dir, score)) { box.innerHTML = `本局 <b>${esc(fmt(score, { meta }))}</b> 未进前 ${CAP} 名 · ${showLink()}`; bind(); return; }
      const rankGuess = j.list.filter(e => j.dir === 'desc' ? e.score >= score : e.score <= score).length + 1;
      box.innerHTML = `🎉 <b>${esc(fmt(score, { meta }))}</b> 能排到第 <b>${rankGuess}</b> 名！留个名字上榜：<div class="row"><input maxlength="12" placeholder="你的名字（最多 12 字）" value="${esc(getName())}"><button>留名上榜</button></div>`;
      const inp = box.querySelector('input'), btn = box.querySelector('button');
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); e.stopPropagation(); }); inp.addEventListener('keyup', e => e.stopPropagation());
      btn.onclick = async () => {
        const name = inp.value.trim(); if (!name) { inp.focus(); return; } setName(name); btn.disabled = true; btn.textContent = '提交中…';
        try { const r = await submit(game, board, name, score, meta); box.innerHTML = `<span class="ok">✔ 上榜成功，第 ${r.rank} 名！</span> ${showLink()}`; bind(); }
        catch (e) { btn.disabled = false; btn.textContent = '重试'; const m = /too many/.test(e.message) ? '提交太频繁，稍后再试' : /range/.test(e.message) ? '成绩不在合理范围' : '提交失败'; let t = box.querySelector('.lb-err'); if (!t) { t = document.createElement('div'); t.className = 'lb-err'; box.appendChild(t); } t.textContent = m; }
      };
      setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
    }).catch(() => { box.innerHTML = '🏆 英雄榜暂时打不开'; });
  }
  return { enabled, show, offer, getName, fetchList, submit, CAP };
})();
/* @lb-end */
