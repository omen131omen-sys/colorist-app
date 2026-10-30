# Учёт колориста — документация

PWA для парикмахера-колориста: склад красок и оксидов в граммах, прайс услуг, журнал работ
с себестоимостью и маржой, траты, аналитика, синхронизация между устройствами.
Работает без сборки и без фреймворков: обычные HTML + CSS + JS, данные в `localStorage`
браузера, по желанию зеркалятся на свой сервер.

## Карта проекта

```
index.html          разметка-каркас: заставка, шапка, <main id="view">, таббар, шторка, тост, confirm
css/app.css         все стили (палитра «Нюд-мокко» в :root)
js/                 код, разбитый на цеха (порядок подключения важен, см. architecture.md)
  core.js           ядро: форматирование, даты/периоды, иконки, шторка/тост/confirm
  costing.js        экономика: цена за грамм, маржа, нормы расхода, себестоимость
  store.js          хранилище: DB, localStorage, миграции
  parser.js         распознавание формул DIKIDI и накладных
  stock.js          экран «Склад» + приход + заказ
  services.js       экран «Услуги» (прайс + типовой расход)
  works.js          экран «Работы» + мастер расчёта работы
  expenses.js       экран «Расход» + оборудование
  report.js         экран «Отчёт»
  settings.js       экран «Настройки» + справочник норм
  sync.js           синхронизация с сервером + резервные копии
  app.js            навигация, FAB, запуск (подключается последним)
sw.js               service worker: офлайн-кэш
manifest.json       манифест PWA (иконки, название)
icon180/512.png     иконки
tests/              автотесты логики (node --test), см. development.md
server/             развёртывание серверной части (nginx + certbot), см. workshops/server.md
data/backups/       выгрузки базы (JSON-копии из приложения)
data/sheets/        исходные Excel-таблицы склада
archive/            монолитный index.html до разбиения (2026-10-30), для сверки
docs/               эта документация
```

## Документы

| Документ | О чём |
|---|---|
| [roadmap.md](roadmap.md) | **Дорожная карта:** этапы развития, когда за что браться, журнал решений |
| [development.md](development.md) | **Как вести разработку:** ветки, выпуск версии, тесты, откат |
| [architecture.md](architecture.md) | Как устроено приложение: рендер, состояние, поток данных, порядок скриптов |
| [data-model.md](data-model.md) | Полная схема базы `DB`: все сущности, поля, миграции |
| [issues.md](issues.md) | Найденные баги, риски и идеи улучшений (бэклог) |
| **Цеха** | |
| [workshops/core.md](workshops/core.md) | Ядро: утилиты, периоды, UI-примитивы |
| [workshops/costing.md](workshops/costing.md) | Экономика: как считается себестоимость и маржа |
| [workshops/store.md](workshops/store.md) | Хранилище и миграции |
| [workshops/parser.md](workshops/parser.md) | Распознавание формул и списков покупок |
| [workshops/stock.md](workshops/stock.md) | Склад |
| [workshops/services.md](workshops/services.md) | Услуги |
| [workshops/works.md](workshops/works.md) | Работы |
| [workshops/expenses.md](workshops/expenses.md) | Расход и оборудование |
| [workshops/report.md](workshops/report.md) | Отчёт |
| [workshops/settings.md](workshops/settings.md) | Настройки и нормы |
| [workshops/sync.md](workshops/sync.md) | Синхронизация и резервные копии |
| [workshops/app.md](workshops/app.md) | Оболочка: навигация, запуск, PWA |
| [workshops/server.md](workshops/server.md) | Серверная часть |

## Как запустить локально

Нужен любой статический сервер (с `file://` service worker не регистрируется, остальное работает):

```
python -m http.server 8793
```

Открыть `http://127.0.0.1:8793/`. Данные: ⚙️ → «Восстановить из копии» → файл из `data/backups/`.

Тесты: `node --test`.

## Выкладка

Сайт — GitHub Pages из ветки `main` репозитория `omen131omen-sys/colorist-app`: push в `main` =
обновление у мастерицы на телефоне. Порядок выпуска, ветка `dev` и откат — в [development.md](development.md).
Данные клиентов (`data/`) и доступ к серверу (`server/onecommand.txt`) в git не попадают (`.gitignore`).
