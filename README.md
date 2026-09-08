# gamehub —— game.satloot.com

展示 GitHub 上各个小游戏的静态站。游戏本体都是单文件 HTML（`dist/*.html`），本站只做三件事：
把它们从各自仓库拉下来、给一个带封面的首页、给一个带工具栏的 `/play/` 壳。没有后端。

## 目录

| 路径 | 说明 |
|---|---|
| `games.json` | **唯一的手工清单**：站点文案、家族链接、每个游戏的 id / 标题 / 简介 / 操作 / 仓库 / dist 路径 / 截图参数 |
| `tools/fetch.mjs` | 用 `gh` 从各仓库拉 dist 单文件 → `site/g/<id>/index.html`；提交 sha/时间记到 `upstream/meta.json`，没变就跳过 |
| `tools/build.mjs` | 由清单生成 `site/index.html`（首页）、`site/play/index.html`（壳）、`site/games.json`、robots、sitemap |
| `tools/shots.mjs` | Edge 无头截封面 → `.shots-tmp/<id>.png`（要先起本地服务） |
| `tools/shots-convert.py` | PNG → `site/shots/<id>.jpg`（1200×750）+ `<id>-s.jpg`（600 宽） |
| `serve.js` | 本地预览 `site/`，默认 8795 |
| `deploy/deploy.sh` | 一键发布到 VPS（拉 + 构建 + 打包 + 换目录 + nginx） |
| `deploy/nginx-game.satloot.com.conf` | 站点配置（纯静态、gzip、html 不缓存） |

`site/g/`、`site/index.html` 等都是生成物，不进 git；`site/shots/*.jpg` 进 git（截图流水线慢，且依赖本机 Edge）。

## 加一个游戏

1. 在 `games.json` 的 `games` 里加一项（`id` 只用小写字母/数字/连字符，会成为 URL）。
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

## 游戏本体的约定

- 必须是零外部请求的单文件（fetch 脚本会粗检）。
- 壳页 `/play/?g=<id>` 用同源 iframe 装载 `/g/<id>/index.html`，所以游戏的 localStorage 存档按 origin 共享——不同游戏的存档 key 别撞名。
- 私有仓库（`public: false`）首页只显示仓库名不给链接；改公开后把字段翻成 `true` 重新构建即可。
