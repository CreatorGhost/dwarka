#!/usr/bin/env bash
# Provision the temporary Bangalore demo box for DWARKA Chapter 1.
# Runs ON the droplet as root. Idempotent enough to re-run; guards refuse to
# clobber anything that already exists.
#
# ponytail: native Node under systemd + Caddy, no Docker. One process, one
# dependency (ws). Swap to a container only if a second service shows up.
set -euo pipefail

HOSTNAME_PUBLIC="${HOSTNAME_PUBLIC:?set HOSTNAME_PUBLIC}"
NODE_VERSION='v22.22.0'
NODE_DIR="/opt/node-${NODE_VERSION}-linux-x64"

echo "==> 1. host"
uname -m
. /etc/os-release && echo "$PRETTY_NAME"

echo "==> 2. packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git xz-utils rsync ufw \
  debian-keyring debian-archive-keyring apt-transport-https gnupg

echo "==> 3. node ${NODE_VERSION}"
if [ ! -e /opt/node ]; then
  tmp="$(mktemp -d)"
  cd "$tmp"
  archive="node-${NODE_VERSION}-linux-x64.tar.xz"
  curl -fsSLO "https://nodejs.org/download/release/${NODE_VERSION}/${archive}"
  curl -fsSLO "https://nodejs.org/download/release/${NODE_VERSION}/SHASUMS256.txt"
  grep " ${archive}\$" SHASUMS256.txt | sha256sum -c -
  tar -xJf "$archive" -C /opt
  ln -s "$NODE_DIR" /opt/node
  cd /
  rm -rf "$tmp"
fi
/opt/node/bin/node --version

echo "==> 4. caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi
caddy version

echo "==> 5. service account"
getent passwd dwarka >/dev/null || \
  useradd --system --create-home --home-dir /var/lib/dwarka --shell /usr/sbin/nologin dwarka
install -d -o dwarka -g dwarka /opt/dwarka /opt/dwarka/game

echo "==> 6. install deps (payload is rsynced separately, before this runs)"
chown -R dwarka:dwarka /opt/dwarka/game
sudo -u dwarka env PATH=/opt/node/bin:/usr/bin:/bin \
  /opt/node/bin/npm --prefix /opt/dwarka/game/server ci --include=dev --omit=optional --no-audit --no-fund

echo "==> 7. systemd unit"
cat > /etc/systemd/system/dwarka-chapter-1.service <<'UNIT'
[Unit]
Description=DWARKA Chapter 1 WebSocket server
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=dwarka
Group=dwarka
WorkingDirectory=/opt/dwarka/game/server
Environment=NODE_ENV=production
Environment=PORT=3210
Environment=PATH=/opt/node/bin:/usr/bin:/bin
EnvironmentFile=/etc/dwarka/server.env
ExecStart=/opt/node/bin/node --import tsx src/index.ts
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
LimitNOFILE=4096
MemoryMax=1G
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
UNIT
systemd-analyze verify /etc/systemd/system/dwarka-chapter-1.service
systemctl daemon-reload

echo "==> 8. firewall (3210 stays private; Caddy fronts it)"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3210/tcp
ufw --force enable
ufw status verbose

echo "==> 9. caddy site"
cat > /etc/caddy/Caddyfile <<CADDY
${HOSTNAME_PUBLIC} {
    reverse_proxy 127.0.0.1:3210
}
CADDY
caddy validate --config /etc/caddy/Caddyfile

echo "==> 10. start"
systemctl enable --now dwarka-chapter-1
sleep 3
systemctl is-active dwarka-chapter-1
curl --fail --silent --show-error http://127.0.0.1:3210/healthz && echo
systemctl restart caddy
sleep 8
curl --fail --silent --show-error "https://${HOSTNAME_PUBLIC}/healthz" && echo

echo "==> PROVISION OK"
