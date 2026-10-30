/* Цех «Экономика»: цена за грамм, нормы, себестоимость, светофор маржи. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, MATERIALS, emptyDB } = require('./helpers');

const НОРМЫ = [
  { id: 'nsh', название: 'Шампунь', ед: 'г', цена: 1.5, накидка: 0 },
  { id: 'nme', название: 'Мелочь', ед: 'раб', цена: 100, накидка: 10, всем: true },
];
const app = loadApp(emptyDB({ materials: MATERIALS, нормы: НОРМЫ }));

test('цена за грамм = цена упаковки / граммы в упаковке', () => {
  assert.equal(app.run('gpr(mById("pwd"))'), 3.6);
});

test('сумма нормы учитывает погрешность', () => {
  assert.equal(app.run('Math.round(нормаСумма({кол:1, цена:100, накидка:10})*100)/100'), 110);
  assert.equal(app.run('Math.round(нормаСумма({кол:20, цена:1.5}))'), 30);
});

test('нормы услуги: свои + общие, если не отключены', () => {
  assert.deepEqual(app.run('нормыУслуги({нормы:[{id:"nsh",кол:20}]})'),
    [{ id: 'nsh', кол: 20 }, { id: 'nme', кол: 1 }]);
  assert.deepEqual(app.run('нормыУслуги({нормы:[{id:"nsh",кол:20}], без_общих:true})'),
    [{ id: 'nsh', кол: 20 }]);
  // ссылка на удалённую норму выпадает
  assert.deepEqual(app.run('нормыУслуги({нормы:[{id:"нет",кол:5}], без_общих:true})'), []);
});

test('снимок норм замораживает цену и выкидывает нулевые строки', () => {
  assert.deepEqual(app.run('снимокНорм([{id:"nsh",кол:0},{id:"nme",кол:1}])'), [
    { норма_id: 'nme', название: 'Мелочь', ед: 'раб', кол: 1, цена: 100, накидка: 10 },
  ]);
});

test('себестоимость работы: материалы по формуле + нормы, округление до рубля', () => {
  // пудра 50 г × 3.6 = 180; Lumia 6.2 10 г × 892/93 ≈ 95.9; Мелочь 110 → 385.9 → 386
  const w = { шаги: [{ материал_id: 'pwd', факт_граммы: 50 }, { материал_id: 'l62', факт_граммы: 10 }],
    нормы: [{ кол: 1, цена: 100, накидка: 10 }] };
  assert.equal(app.run('calcCost(__arg, DB.materials)', w), 386);
});

test('светофор маржи: минус / ниже 45% / норма', () => {
  assert.equal(app.run('margLevel(-1, 1000).b'), 'r');
  assert.equal(app.run('margLevel(440, 1000).b'), 'a');
  assert.equal(app.run('margLevel(450, 1000).b'), 'g');
});

test('маржа считается только с MARG_FROM', () => {
  assert.equal(app.run('margCounted({дата:"2026-08-31"})'), false);
  assert.equal(app.run('margCounted({дата:"2026-09-01"})'), true);
});

test('списано: у старых записей без поля — запрошенное', () => {
  assert.equal(app.run('спис({факт_граммы:30})'), 30);
  assert.equal(app.run('спис({факт_граммы:30, списано:12})'), 12);
});
