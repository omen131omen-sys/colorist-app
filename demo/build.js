/* Сборка демо-версии: node demo/build.js
   Одна страница для показа ссылкой: новый вид по концепту «стекло, палитра мокко» (demo/skin.*)
   поверх настоящей логики цехов и выдуманных данных за три месяца (demo/demo-data.js).
   Рабочий код не меняется: всё демо-поведение — в demo/*.js и в точечных заменах ниже,
   каждая замена проверяется, чтобы после правок цехов сборка не собрала молча не то.

   На выходе (demo/dist/, в git не кладём):
   - colorist-demo.html — для публикации артефактом (без <html>/<head>: обёртку ставит площадка);
   - preview.html — то же с обёрткой, для проверки в браузере: python -m http.server 8793 → /demo/dist/preview.html */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
function заменить(текст, что, на, где) {
  if (!текст.includes(что)) throw new Error(`${где}: не найдено «${что}» — цех поменялся, поправьте demo/build.js`);
  return текст.split(что).join(на);
}

// Порядок цехов — из index.html, как у живого приложения. app.js (старая оболочка) заменяет skin.js.
const html = read('index.html');
const ЦЕХА = [...html.matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map(m => m[1]);
if (ЦЕХА[ЦЕХА.length - 1] !== 'app') throw new Error('index.html: app.js должен подключаться последним');

const цех = имя => {
  let код = read(`js/${имя}.js`);
  // Демо-хранилище с префиксом вместо localStorage: живая база colorist_v7 недосягаема
  if (код.includes('localStorage')) код = код.split('localStorage').join('ДЕМО_LS');
  if (имя === 'costing')   // в демо все работы с себестоимостью — маржа считается за весь период
    код = заменить(код, "const MARG_FROM='2026-09-01';", "const MARG_FROM='0000-00-00';", 'costing.js');
  if (имя === 'core')      // комментарий про площадку разработки — на сайте демо ни к чему
    код = заменить(код, 'блокируется в песочнице артефакта', 'блокируется во встроенных окнах', 'core.js');
  return код;
};
const скрипт = (код, имя) => {
  if (/<\/script/i.test(код)) throw new Error(`${имя}: «</script» внутри кода сломает страницу`);
  return `<script>/* ${имя} */\n${код}\n</script>`;
};

const скрипты = [
  скрипт(read('demo/demo-start.js'), 'demo-start.js'),
  ...ЦЕХА.filter(и => и !== 'app').map(и => скрипт(цех(и), и + '.js')),
  скрипт(read('demo/demo-data.js'), 'demo-data.js'),
  скрипт(read('demo/demo-mode.js'), 'demo-mode.js'),
  скрипт(read('demo/skin.js'), 'skin.js'),
];

const страница = `<title>Учёт колориста · демо</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&family=Manrope:wght@400;500;600;700&display=swap">
<style>
${read('demo/skin.css')}
</style>
${read('demo/skin.html').trim()}
${скрипты.join('\n')}
`;

const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'colorist-demo.html'), страница, 'utf8');
fs.writeFileSync(path.join(dist, 'preview.html'),
  `<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  `<style>[hidden]{display:none!important}</style>\n</head><body>\n${страница}</body></html>\n`, 'utf8');
// Сайт демо (GitHub Pages, репозиторий colorist-demo): полноценная страница с иконкой,
// чтобы с телефона её можно было поставить «На экран Домой», как приложение.
const site = path.join(dist, 'site');
fs.mkdirSync(site, { recursive: true });
fs.writeFileSync(path.join(site, 'index.html'),
  `<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  `<meta name="theme-color" content="#d6cbc1">\n` +
  `<meta name="description" content="Учёт колориста: склад в граммах, работы с маржой, расход и отчёт. Демо-версия.">\n` +
  `<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n` +
  `<meta name="apple-mobile-web-app-title" content="Колорист">\n` +
  `<link rel="apple-touch-icon" href="icon180.png">\n<link rel="icon" href="icon180.png">\n` +
  `<style>[hidden]{display:none!important}</style>\n</head><body>\n${страница}</body></html>\n`, 'utf8');
fs.copyFileSync(path.join(ROOT, 'icon180.png'), path.join(site, 'icon180.png'));
console.log(`Готово: demo/dist/colorist-demo.html (${Math.round(Buffer.byteLength(страница) / 1024)} КБ) и demo/dist/site/`);
