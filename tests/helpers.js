/* Загрузчик цехов для тестов в Node — без браузера.
   Файлы js/ — классические скрипты с общим глобальным scope, поэтому грузим их по очереди
   в один vm-контекст, как это делает браузер. DOM не нужен: тестируем чистую логику. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ЦЕХА = ['core', 'costing', 'store', 'parser', 'stock', 'sync'];

function loadApp(db) {
  const mem = {};
  const ctx = vm.createContext({
    console,
    localStorage: {
      getItem: k => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; },
    },
    window: { addEventListener() {} },
    navigator: {},
    location: { protocol: 'http:' },
    document: { getElementById: () => null, querySelectorAll: () => [] },
  });
  for (const f of ЦЕХА) {
    const file = path.join(__dirname, '..', 'js', f + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  const app = {
    // выполнить выражение внутри приложения; результат — обычный JSON (объекты из vm-контекста
    // с чужими прототипами deepStrictEqual не сравнивает)
    run(expr, arg) {
      ctx.__arg = arg === undefined ? undefined : JSON.parse(JSON.stringify(arg));
      const v = vm.runInContext(expr, ctx);
      return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
    },
    setDB(d) { app.run('DB = __arg', d); },
  };
  if (db) app.setDB(db);
  return app;
}

/* Небольшой выдуманный склад — реальных данных в публичном репозитории нет. */
const mat = (id, бренд, название, тип, нетто_г, цена_упаковки, остаток_г = 100) =>
  ({ id, бренд, название, тип, объём_мл: 0, тара_г: 0, нетто_г, цена_упаковки, остаток_г, мин_остаток_г: 30 });

const MATERIALS = [
  mat('l1012', 'Helen Seward', 'Краска Lumia 10.12', 'краска', 93, 892),
  mat('l923', 'Helen Seward', 'Краска Lumia 9.23', 'краска', 93, 892),
  mat('l92', 'Helen Seward', 'Краска Lumia 9.2', 'краска', 93, 892),
  mat('l621', 'Helen Seward', 'Краска Lumia 6.21', 'краска', 93, 892),
  mat('l62', 'Helen Seward', 'Краска Lumia 6.2', 'краска', 93, 892),
  mat('bb62', 'Helen Seward', 'Краска BB 6.2', 'краска', 93, 950),
  mat('e066', 'Estel', 'Краска Estel Princess 0.66', 'краска', 56, 400),
  mat('ox15', 'Helen Seward', 'Оксид 1.5% · Helen Seward', 'оксид', 1050, 900),
  mat('ox6h', 'Helen Seward', 'Оксид 6% · Helen Seward', 'оксид', 1050, 900),
  mat('ox6l', 'Londa', 'Оксид 6% 20vol · Londa', 'оксид', 1086, 774),
  mat('pwd', 'Kezy', 'Пудра обесцвечивающая', 'пудра', 500, 1800),
  mat('shp', 'Kezy', 'Шампунь Post color', 'уход', 1000, 1200),
];

const emptyDB = (over = {}) => ({
  materials: [], pieces: [], services: [], works: [], purchases: [], expenses: [],
  equipment: [], _v: 4, ...over,
});

module.exports = { loadApp, MATERIALS, emptyDB, mat };
