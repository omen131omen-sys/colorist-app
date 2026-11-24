# Шрифты

Лежат в приложении, чтобы оно работало без интернета (файлы в `ASSETS` у `sw.js`).

| Файл | Шрифт | Начертания | Источник |
|---|---|---|---|
| `jost-cyrillic.woff2`, `jost-latin.woff2` | Jost (цифры, заголовки) | 200–500, вариативный | Google Fonts |
| `manrope-cyrillic.woff2`, `manrope-latin.woff2` | Manrope (текст) | 400–700, вариативный | Google Fonts |

Оба шрифта — под лицензией SIL Open Font License 1.1 (https://openfontlicense.org): можно встраивать
и распространять вместе с приложением. Подмножества — кириллица и латиница, как их отдаёт Google Fonts;
`unicode-range` в `css/app.css` совпадает с этими подмножествами.
