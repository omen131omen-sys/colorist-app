# Цех «Оболочка» — [js/app.js](../../js/app.js), [index.html](../../index.html), [sw.js](../../sw.js), [manifest.json](../../manifest.json)

## Навигация
- `TABS` — `{ключ: {t: заголовок, s: подзаголовок, r: render-функция}}`.
  Вкладки: `stock`, `services`, `works`, `expenses`, `report` + `settings` (шестерёнка).
- `go(tab)` — подсветка таббара, шапка, `#view`, FAB, прокрутка наверх.
- `fabFor(tab)` — нижняя кнопка действия для вкладки.

**Новая вкладка** = render-функция в своём файле цеха + строка в `TABS` + кнопка в `nav.tabbar`
в index.html (+ `fabFor`, если нужна кнопка) + файл в `ASSETS` в sw.js.

## Запуск (конец app.js)
1. Обработчики таббара. 2. `load()`. 3. `go('stock')`. 4. `pullSync()`.
5. Регистрация `sw.js` (только https). 6. `navigator.storage.persist()`.
7. Через 950 мс скрыть заставку.

## index.html
Только каркас: заставка `#splash`, шапка (`#hTitle`, `#hSub`, `#gearBtn`), `main#view`, `#fabWrap`,
таббар, шторка (`#sheetBg/#sheet/#sheetTitle/#sheetBody/#sheetFoot`), `#toast`, confirm
(`#confirmBg/#confirmMsg/#confirmYes`), затем скрипты цехов по порядку.

## Service worker
- `CACHE = 'colorist-vN'`, `ASSETS` — список офлайн-файлов. Добавили файл → внести и поднять N.
- install: кэш ASSETS + `skipWaiting`; activate: удалить старые кэши + `clients.claim`.
- fetch (только GET): сеть → положить копию в кэш; нет сети → кэш (без учёта query) → index.html.

## Оформление
- Палитра «Нюд-мокко» — CSS-переменные в `:root` ([css/app.css](../../css/app.css)).
- Мобильная колонка 390px, на ≥800px — 720px, сетки в 2–3 колонки, шторка становится модалкой.
- Шрифты: системный UI + Cormorant Garamond для заголовков (если установлен, иначе Georgia).
