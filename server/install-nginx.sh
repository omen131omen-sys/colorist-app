#!/usr/bin/env bash
# Вариант для сервера, где 80/443 уже занят nginx (Caddy не нужен).
# Добавляет отдельный сайт для синка и выпускает сертификат certbot'ом.
# Существующие сайты nginx не трогает. Запуск: sudo bash install-nginx.sh
set -euo pipefail

IP=$(curl -fsS ifconfig.me || curl -fsS api.ipify.org)
DOMAIN="${IP}.sslip.io"
echo "==> Домен: $DOMAIN"

echo "==> Убираю Caddy (порты занимает nginx)…"
systemctl disable --now caddy 2>/dev/null || true

echo "==> Добавляю сайт в nginx…"
cat > /etc/nginx/sites-available/colorist <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 20m;
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host \$host;
    }
}
EOF
mkdir -p /etc/nginx/sites-enabled
ln -sf /etc/nginx/sites-available/colorist /etc/nginx/sites-enabled/colorist
nginx -t && systemctl reload nginx

echo "==> Ставлю certbot (если нет) и выпускаю сертификат…"
command -v certbot >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx

issue() {
  certbot --nginx -d "$1" --non-interactive --agree-tos --register-unsafely-without-email --redirect
}

if ! issue "$DOMAIN"; then
  echo "!! Let's Encrypt отказал для sslip.io (возможен общий лимит). Пробую nip.io…"
  DOMAIN="${IP}.nip.io"
  sed -i "s/server_name .*/server_name ${DOMAIN};/" /etc/nginx/sites-available/colorist
  nginx -t && systemctl reload nginx
  issue "$DOMAIN"
fi

sleep 2
KEY=$(grep 'Environment=KEY=' /etc/systemd/system/colorist-sync.service | cut -d= -f3)
echo
echo "=================================================================="
if curl -fsS "https://${DOMAIN}/health" | grep -q ok; then
  echo "  ГОТОВО ✅  https://${DOMAIN}/health отвечает ok"
else
  echo "  Сертификат выпущен, но проверка не прошла."
  echo "  Выполни вручную: curl -v https://${DOMAIN}/health"
fi
echo
echo "  Впиши в приложении (Отчёт → Синхронизация с сервером):"
echo
echo "  Адрес:  https://${DOMAIN}"
echo "  Ключ:   ${KEY}"
echo "=================================================================="
