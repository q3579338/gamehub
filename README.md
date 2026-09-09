# gamehub —— game.satloot.com

展示小游戏的静态站。游戏本体都是单文件 HTML，本站只做三件事：
把它们收集到一起（GitHub 各仓库的 `dist/*.html`，或本仓库 `games/` 里自制的）、给一个带封面和分类导航的首页、给一个带工具栏的 `/play/` 壳。没有后端。

## 目录

| 路径 | 说明 |
|---|---|
| `games.json` | **唯一的手工清单**：站点文案、分类、家族链接、每个游戏的 id / 标题 / 简介 / 操作 / 来源 / 截图参数 |
| `games/<id>/index.html` | **本站自制的游戏本体**（单文件，零外部请求）。清单里用 `local` 字段指向它 |
| `tools/fetch.mjs` | 把每个游戏本体放到 `site/g/<id>/index.html`：远程的用 `gh` 从仓库拉（按提交 sha 判断是否重下），本地的直接复制（按内容 sha1）；版本信息记到 `upstream/meta.json` |
| `tools/build.mjs` | 由清单生成首页 / `/play/` 壳 / `/hall/` 英雄榜，**中英各一套**（`site/` 与 `site/en/`），外加 `site/games.json`、robots、sitemap |
| `tools/make-og.mjs` | 用 resvg + 系统字体生成 `site/og.png`（1200×630 站点分享图，进 git）；`/hall/` 的 og:image 用它，首页用招牌游戏截图 |
| `tools/shots.mjs` | Edge 无头截封面 → `.shots-tmp/<id>.png`（要先起本地服务） |
| `tools/shots-convert.py` | PNG → `site/shots/<id>.jpg`（1200×750）+ `<id>-s.jpg`（600 宽） |
| `serve.js` | 本地预览 `site/`，默认 8795；`/dev/<id>/` 直接映射 `games/<id>/`，改本地游戏刷新即见 |
| `deploy/deploy.sh` | 一键发布到 VPS（拉 + 构建 + 打包 + 换目录 + nginx） |
| `deploy/nginx-game.satloot.com.conf` | 站点配置（纯静态、gzip、html 不缓存） |

`site/g/`、`site/index.html` 等都是生成物，不进 git；`site/shots/*.jpg` 进 git（截图流水线慢，且依赖本机 Edge）。

## 首页

- 白底浅色为默认主题，右上角 🌙 切深色，选择记在 localStorage（`gh:theme`）。
- 游戏按 `games.json → site.categories` 分区展示；吸顶导航条上有分类筛选（带数量）、搜索框（标题 / 标签 / 简介）、「随机来一局」。
  `#cat-<id>` 锚点可直接定位到某个分类（例如 `/#cat-puzzle`）。
- `/play/` 壳的工具栏多了「换游戏」面板，按分类列出全部游戏，不用回首页。

## 中英双语

沿用 satloot-home 的方案：同一份模板按语言表 `L` 渲染两次。

| 中文（zh-CN） | 英文（en） |
|---|---|
| `/` | `/en/` |
| `/play/?g=<id>` | `/en/play/?g=<id>` |
| `/hall/` | `/en/hall/` |

- 游戏本体 `/g/<id>/` 只有一份（第三方单文件，不动），两种语言的壳都指向它；游戏内界面仍是它自己的语言。
- 英文文案来自 `games.json` 的 `*En` 字段（`titleEn` / `descEn` / `tagsEn` / `controlsEn`、分类 `nameEn`、榜 `labelEn`、家族链接 `descEn`），缺了回落中文。界面固定文案（导航、按钮、页脚、说明）在 `tools/build.mjs` 顶部的 `LOCALES` 表里。
- 每页带 `<html lang>`、canonical、hreflang（zh-CN / en / x-default=zh-CN）、`og:locale` + alternate、OG / Twitter 卡片（含 og:image 尺寸）、JSON-LD（`@graph`：Organization + WebSite + WebPage + ItemList）；`/play/` 是 noindex 的壳，只有 title；sitemap 里每个 URL 带两种语言的 alternate，不含 `/play/`。
- title ≤ 60 字符、description 80–160 字符：description 由 `clampNames` 按长度截取游戏名（`LOCALES.*.metaDesc` / `hallMeta`）。
- 首访语言：`/` 页首有一段小脚本，localStorage 没记过 `gh:lang` 且 `navigator.language` 不是 zh 开头就 `location.replace('/en/')`；点导航或页脚的语言切换（EN / 中文）会记下选择，之后不再自动跳。英文页不做反向跳转。
- 验收：`node tools/build.mjs` 后 `site/en/index.html` 里含汉字的行只剩 JSON-LD 里的 `alternateName` 和两个「中文」切换链接（Git Bash 自带 grep 不认 UTF-8 区间，用 `LC_ALL=C.UTF-8 grep -c '[一-龥]'` 才准）。

## 加一个游戏

### A. 本站自制（推荐给小型休闲游戏）

1. 在 `games/<id>/index.html` 写游戏，约定：单文件、零外部请求；支持 `?still=1&seed=N` 定帧参数（进入一个好看的中局画面并停止动画，供截封面）；localStorage 的 key 用 `gh:<id>:` 前缀，避免和别的游戏撞名。
2. 在 `games.json` 的 `games` 里加一项：`id`、`title`、`titleEn`、`desc`、`descEn`、`kind`、`engine`、`tags`、`tagsEn`、`controls`、`controlsEn`、`cat`（分类 id）、`local: "games/<id>/index.html"`、`shot: "still=1&seed=7"`；有榜的话 `boards` 每项带 `label` / `labelEn`。
3. `node tools/fetch.mjs <id>`，然后同 B 的第 3、4 步。

### B. 来自 GitHub 仓库

1. 在 `games.json` 的 `games` 里加一项（`id` 只用小写字母/数字/连字符，会成为 URL），填 `repo` 与 `dist` 路径和 `cat`。
2. `node tools/fetch.mjs <id>` 拉本体。
3. `node serve.js` 起本地，另开终端 `node tools/shots.mjs <id>` 截图，`python tools/shots-convert.py <id>` 压图。
   截图参数写在清单的 `shot` 字段（各游戏 README 的「调试参数」，通常 `lv=N&seed=N&still=ms`）。
4. `node tools/build.mjs`，本地看一眼 http://localhost:8795/ ，没问题 `bash deploy/deploy.sh`。

## 发布

```bash
bash deploy/deploy.sh                # 拉最新 + 构建 + 发布
SKIP_FETCH=1 bash deploy/deploy.sh   # 只发本地 site/
```

服务器：源站地址在本机 `~/.earnfarm-deploy/host.txt`（不入库），站点目录 `/var/www/gamehub`，nginx 站点 `game.satloot.com`，证书用本机自签（Cloudflare Full 回源）。
DNS：Cloudflare 里 `game` A 记录指向源站，橙云代理。

## 英雄榜（/hall/ 与游戏内 🏆）

- 服务：`server/scores.mjs`，零依赖 Node，监听 127.0.0.1:8796，nginx 只把 `/api/` 反代过去。systemd 单元 `deploy/gamehub-scores.service`（deploy.sh 会一并安装/重启），数据在 `/var/lib/gamehub/scores.jsonl`（追加写，每小时另存快照）。
- 接口：`GET /api/scores?game=&board=&limit=`、`GET /api/scores?all=1`、`POST /api/scores {game, board, name, score, meta}`、`GET /api/health`。每榜公开前 20；名字 ≤ 12 字；成绩范围与升降序写在服务端 `BOARDS`；同 IP 10 分钟最多 12 次，同分 2 分钟去重。
- 客户端：`games/_shared/leaderboard.js` 是唯一源，`node tools/inject.mjs` 把它同步进每个自制游戏 `/* @lb-start */…/* @lb-end */` 之间。游戏里：顶栏 🏆 打开榜单（多难度带标签页）；结算面板的 `#ovLB` 容器由 `LB.offer()` 渲染「留名上榜」（够格才出现）。
- 每个游戏的榜在 `games.json` 的 `boards` 字段（key / label / fmt），`/hall/` 页和壳都据此渲染。新游戏要上榜：服务端 `BOARDS` 加范围 + 清单加 `boards` + 游戏里接 `LB.offer`。
- 本地调试：`node serve.js` 会把 `/api/` 转到 8796，另开 `node server/scores.mjs`（数据落在 `data/`，已 gitignore）。

## 游戏本体的约定

- 必须是零外部请求的单文件（fetch 脚本会粗检 `src=/href=` 指向外站的引用）。
- 壳页 `/play/?g=<id>` 用同源 iframe 装载 `/g/<id>/index.html`，所以游戏的 localStorage 存档按 origin 共享——不同游戏的存档 key 别撞名（本站自制的统一 `gh:<id>:` 前缀）。
- 私有仓库（`public: false`）首页只显示仓库名不给链接；改公开后把字段翻成 `true` 重新构建即可。本站自制的显示「本站自制」。
