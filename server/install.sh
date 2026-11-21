#!/bin/bash
# Petit à petit: installs the sync server on a Raspberry Pi (Raspberry Pi OS / Debian), publishes it on the
# tailnet with `tailscale serve`, and writes the pairing link in the home folder of the user who ran it.
# Run from the folder that holds sync-server.mjs, pair-link.mjs and petit-a-petit-sync.service:
#   sudo bash install.sh
# Running it again updates the files and keeps the tokens and the data.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Lancer avec sudo : sudo bash $0"; exit 1; }
SRC="$(cd "$(dirname "$0")" && pwd)"
OWNER="${SUDO_USER:-root}"
HOME_DIR="$(getent passwd "$OWNER" | cut -d: -f6)"

echo "== 1/5 Node.js"
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  apt-get update -qq
  apt-get install -y -qq nodejs
fi
echo "node $(node -v)"

echo "== 2/5 Service user, folders, files"
id petitapetit >/dev/null 2>&1 || useradd --system --home /var/lib/petit-a-petit-sync --shell /usr/sbin/nologin petitapetit
mkdir -p /opt/petit-a-petit-sync /var/lib/petit-a-petit-sync
install -m 644 "$SRC/sync-server.mjs" "$SRC/pair-link.mjs" /opt/petit-a-petit-sync/
chown petitapetit: /var/lib/petit-a-petit-sync
chmod 750 /var/lib/petit-a-petit-sync

echo "== 3/5 Tokens (kept if already there)"
if [ ! -f /etc/petit-a-petit-sync.env ]; then
  umask 077
  {
    echo "SYNC_TOKEN=$(openssl rand -hex 24)"
    echo "STATUS_TOKEN=$(openssl rand -hex 24)"
    echo "ALLOWED_ORIGINS=https://minihollow.github.io"
    echo "DATA_DIR=/var/lib/petit-a-petit-sync"
  } > /etc/petit-a-petit-sync.env
fi
chmod 600 /etc/petit-a-petit-sync.env

echo "== 4/5 systemd service"
install -m 644 "$SRC/petit-a-petit-sync.service" /etc/systemd/system/petit-a-petit-sync.service
systemctl daemon-reload
systemctl enable --now petit-a-petit-sync
systemctl restart petit-a-petit-sync
for i in 1 2 3 4 5 6; do curl -fsS http://127.0.0.1:8787/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:8787/health >/dev/null || { echo "Le service ne répond pas : journalctl -u petit-a-petit-sync -n 30"; exit 1; }
echo "service ok"

echo "== 5/5 HTTPS on the tailnet"
tailscale serve --bg 8787
tailscale serve status
NAME="$(tailscale status --json | node -e 'let s="";process.stdin.on("data",(d)=>{s+=d;}).on("end",()=>console.log(JSON.parse(s).Self.DNSName.replace(/\.$/,"")))')"
TOKEN="$(sed -n 's/^SYNC_TOKEN=//p' /etc/petit-a-petit-sync.env)"
OUT="$HOME_DIR/petit-a-petit-sync/lien-synchro.txt"
mkdir -p "$(dirname "$OUT")"
node /opt/petit-a-petit-sync/pair-link.mjs "https://$NAME" "$TOKEN" > "$OUT"
chown "$OWNER": "$OUT"
chmod 600 "$OUT"
echo "Adresse : https://$NAME"
echo "Lien d'association écrit dans $OUT (à ouvrir une fois sur chaque appareil)."
echo "Terminé."
