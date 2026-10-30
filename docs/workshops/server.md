# Цех «Сервер» — [server/](../../server/)

## Как устроено на сервере (снято 2026-10-30)

```
https://SERVER_IP.sslip.io  ──nginx (443, certbot)──▶  127.0.0.1:8787  node /opt/colorist/server.js
                                                                              └─ /opt/colorist/data/
                                                                                   data.json            текущая база
                                                                                   backup-ГГГГ-ММ-ДД.json  по копии в день, 30 последних
```

| Файл в проекте | Где на сервере |
|---|---|
| [server/sync/server.js](../../server/sync/server.js) | `/opt/colorist/server.js` — сам сервис, Node без зависимостей |
| [server/sync/colorist-sync.service](../../server/sync/colorist-sync.service) | `/etc/systemd/system/colorist-sync.service` (ключ в проекте заменён заглушкой) |
| [server/nginx-colorist.conf](../../server/nginx-colorist.conf) | `/etc/nginx/sites-available/colorist` |
| [server/install-nginx.sh](../../server/install-nginx.sh) | установщик nginx + certbot (то же, что в `onecommand.txt`) |
| `server/onecommand.txt` | ssh + установщик одной строкой; **не в git** (IP, пользователь, путь к ключу) |

Сервер: Ubuntu, Node 22, сервис работает от root, `Restart=always`.

## server.js

- `GET /health` → `ok`.
- `GET /data` (заголовок `X-Key`) → содержимое `data.json` (`{updatedAt, db}`) или 404, если пусто.
- `PUT /data` → тело должно быть JSON с `updatedAt` и `db`, иначе 400; лимит 10 МБ. Перед записью —
  `dailyBackup()`: первая запись за день копирует **предыдущее** состояние в `backup-<дата>.json`,
  хранится 30 последних. Запись атомарная (`data.json.tmp` → rename).
- Неверный ключ → 401. CORS открыт для всех адресов (защита — только ключ).

Сервер **ничего не сливает и не сравнивает** — хранит то, что прислали последним. Вся логика
слияния — в приложении ([sync.md](sync.md)).

## Восстановление данных с сервера

Если в приложении что-то потерялось — на сервере есть копии за 30 дней. Скачать нужную:

```
scp -i C:\Users\omen1\.ssh\omen_server omen@SERVER_IP:/opt/colorist/data/backup-2026-10-26.json .
```

Файл в формате `{updatedAt, db}` — для «Восстановить из копии» в приложении нужен только `db`
(приложение проверяет наличие `materials` и `works` на верхнем уровне).

## Переезд / новый сервер

1. Node 18+, скопировать `server/sync/server.js` в `/opt/colorist/`.
2. `colorist-sync.service` в `/etc/systemd/system/`, вписать свой ключ, `systemctl enable --now colorist-sync`.
3. nginx + certbot: `server/install-nginx.sh` (или по образцу `nginx-colorist.conf`).
4. Перенести `/opt/colorist/data/data.json` со старого сервера.

## Идеи
- Отдавать `Cache-Control: no-store` на `GET /data` (сейчас приложение просит это само).
- Ревизия + `If-Match` на PUT — закрыло бы последнее окно гонки между устройствами.
- Отдельный пользователь вместо root.
- Несколько баз (по ключу на мастера) — первый шаг к раздаче приложения другим колористам.
