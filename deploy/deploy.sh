#!/usr/bin/env bash
# game.satloot.com 一键发布（在本机跑，走 SSH 推到 VPS）。
#
# 用法：
#   bash deploy/deploy.sh            # 抓最新游戏 + 构建 + 发布
#   SKIP_FETCH=1 bash deploy/deploy.sh   # 不去 GitHub 拉，只用本地 site/
#
# 共存原则（VPS 上还跑着 bnbbang / earn / faucet / tool）：
# - 只新增 game.satloot.com 的站点文件和 /var/www/gamehub 目录，绝不改动任何既有站点配置；
# - 站点目录整目录替换（先解到 .new 再换名），中途失败旧站点仍在；
# - reload 之前先 nginx -t，没过就原样退出，不碰正在服务的 nginx。
set -euo pipefail

# 部署目标不写进仓库（站点套着 Cloudflare，源站 IP 不公开）：export HOST=user@host，或写在 ~/.earnfarm-deploy/host.txt
HOST="${HOST:-$(cat "$HOME/.earnfarm-deploy/host.txt" 2>/dev/null || true)}"
[ -n "$HOST" ] || { echo "!! 未设置部署目标：export HOST=user@host 或写入 ~/.earnfarm-deploy/host.txt"; exit 1; }
KEY="${KEY:-$HOME/.earnfarm-deploy/earnfarm_deploy_key}"
DOMAIN=game.satloot.com
WEBROOT=/var/www/gamehub

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$HERE/deploy/nginx-$DOMAIN.conf"
SITE="$HERE/site"

cd "$HERE"
if [ -z "${SKIP_FETCH:-}" ]; then
  echo "==> 从 GitHub 拉游戏"
  node tools/fetch.mjs
fi
echo "==> 构建站点"
node tools/build.mjs

# 发布前门禁：每个游戏本体 + 封面都得在
while read -r id; do
  [ -s "$SITE/g/$id/index.html" ] || { echo "!! 缺游戏本体 site/g/$id/index.html（先跑 node tools/fetch.mjs）"; exit 1; }
  [ -s "$SITE/shots/$id.jpg" ]    || { echo "!! 缺封面 site/shots/$id.jpg（先跑截图流水线，见 README）"; exit 1; }
done < <(node -e "for(const g of require('./games.json').games)console.log(g.id)")
[ -s "$SITE/index.html" ] || { echo "!! 缺 site/index.html"; exit 1; }
for p in en/index.html en/play/index.html en/hall/index.html hall/index.html play/index.html; do
  [ -s "$SITE/$p" ] || { echo "!! 缺 site/$p（node tools/build.mjs 应同时产出中英两套页面）"; exit 1; }
done
[ -f "$CONF" ] || { echo "!! 找不到 $CONF"; exit 1; }

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$HOST")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new -q)

TGZ="$(mktemp -t gamehub-XXXXXX).tgz"
tar czf "$TGZ" -C "$SITE" .
echo "==> 推站点包（$(du -h "$TGZ" | cut -f1)）"
"${SCP[@]}" "$TGZ" "$HOST:/tmp/gamehub.tgz"
rm -f "$TGZ"

echo "==> 推英雄榜服务（/opt/gamehub/server + systemd gamehub-scores）"
"${SSH[@]}" "mkdir -p /opt/gamehub/server /var/lib/gamehub && chown www-data:www-data /var/lib/gamehub"
"${SCP[@]}" "$HERE/server/scores.mjs" "$HOST:/opt/gamehub/server/scores.mjs"
"${SCP[@]}" "$HERE/deploy/gamehub-scores.service" "$HOST:/etc/systemd/system/gamehub-scores.service"
"${SSH[@]}" "systemctl daemon-reload && systemctl enable --quiet gamehub-scores && systemctl restart gamehub-scores && sleep 1 && systemctl is-active gamehub-scores"

echo "==> 推 nginx 站点配置"
"${SCP[@]}" "$CONF" "$HOST:/etc/nginx/sites-available/$DOMAIN"

echo "==> 服务器端：解包换目录 + 启用站点 + 校验配置"
"${SSH[@]}" "set -e
    rm -rf $WEBROOT.new
    mkdir -p $WEBROOT.new
    tar xzf /tmp/gamehub.tgz -C $WEBROOT.new
    rm -f /tmp/gamehub.tgz
    chown -R www-data:www-data $WEBROOT.new 2>/dev/null || true
    chmod -R a+rX $WEBROOT.new
    if [ -d $WEBROOT ]; then mv $WEBROOT $WEBROOT.old; fi
    mv $WEBROOT.new $WEBROOT
    rm -rf $WEBROOT.old
    ln -sfn /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
    if nginx -t; then
        systemctl reload nginx
        echo '   nginx 已 reload'
    else
        rm -f /etc/nginx/sites-enabled/$DOMAIN
        echo '!! nginx -t 未通过，已撤销软链，nginx 未 reload'
        exit 1
    fi
    echo '   站点文件：'; du -sh $WEBROOT; ls $WEBROOT/g"

echo "==> 回源自检（绕过 Cloudflare，直连源站）"
"${SSH[@]}" "for p in / /en/ /play/?g=tuanzi-tetris /en/play/?g=tuanzi-tetris /g/tuanzi-tetris/index.html /shots/tuanzi-tetris.jpg /sitemap.xml /hall/ /en/hall/ /api/health \"/api/scores?game=minesweeper&board=time0\"; do
    curl -s -o /dev/null -w \"   %{http_code}  \$p  (%{size_download} B)\n\" -H 'Host: $DOMAIN' \"http://127.0.0.1\$p\"; done"

echo
echo "完成：https://$DOMAIN/  ·  英文版 https://$DOMAIN/en/"
echo "（若域名还没在 Cloudflare 加 A 记录指向源站（橙云代理），公网仍打不开；加上即生效。）"
