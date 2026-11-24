/* Демо-данные (demo/demo-data.js): целые, правдоподобные и в текущем формате базы.
   Демо видит человек, который выбирает, пользоваться ли приложением, — битая ссылка
   на материал или маржа, не совпадающая с формулой, там хуже, чем в тестах. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./helpers');

const ДЕМО = fs.readFileSync(path.join(__dirname, '..', 'demo', 'demo-data.js'), 'utf8');
function демо(сегодня) {
  const app = loadApp();
  app.run(ДЕМО);
  const db = app.run(`демоБаза(${JSON.stringify(сегодня)})`);
  return { app, db };
}

test('период: с 1-го числа три месяца назад по сегодня, без будущих дат', () => {
  const { db } = демо('2026-11-10');
  const даты = [...db.works.map(w => w.дата), ...db.expenses.map(e => e.дата)].sort();
  assert.ok(даты[0] >= '2026-08-01');
  assert.ok(даты[даты.length - 1] <= '2026-11-10');
  const месяцы = new Set(db.works.map(w => w.дата.slice(0, 7)));
  assert.deepStrictEqual([...месяцы].sort(), ['2026-08', '2026-09', '2026-10', '2026-11']);
  assert.ok(db.works.length >= 90, 'работ мало для демо: ' + db.works.length);
});

test('ссылки целые: услуги, материалы, закупки', () => {
  const { db } = демо('2026-11-10');
  const mid = new Set(db.materials.map(m => m.id)), sid = new Set(db.services.map(s => s.id));
  db.works.forEach(w => {
    assert.ok(sid.has(w.услуга_id), w.id);
    w.шаги.forEach(s => assert.ok(mid.has(s.материал_id), w.id + ' ' + s.материал_id));
  });
  db.expenses.filter(e => e.материал_id).forEach(e => assert.ok(mid.has(e.материал_id), e.id));
  assert.strictEqual(new Set(db.works.map(w => w.id)).size, db.works.length);
  assert.strictEqual(new Set(db.expenses.map(e => e.id)).size, db.expenses.length);
});

test('склад прожит без минусов: списано ровно столько, сколько в формуле', () => {
  const { db } = демо('2026-11-10');
  db.materials.forEach(m => assert.ok(m.остаток_г >= 0, m.название));
  db.works.filter(w => !w.без_склада).forEach(w =>
    w.шаги.forEach(s => assert.strictEqual(s.списано, s.факт_граммы, w.id)));
  // на складе есть что заказать — иначе в демо не видно «на исходе»
  assert.ok(db.materials.filter(m => m.остаток_г <= m.мин_остаток_г).length >= 2);
});

test('формула каждой работы разбирается в те же строки', () => {
  const { app, db } = демо('2026-11-10');
  db.works.filter(w => w.формула).forEach(w => {
    const r = app.run('parseFormulaText(__arg.f, DB.materials)', { f: w.формула });
    assert.deepStrictEqual(r.map(l => [l.материал_id, l.граммы]),
      w.шаги.map(s => [s.материал_id, s.факт_граммы]), w.формула);
  });
});

test('маржа = цена − себестоимость; в основном зелёная, есть пара в минус', () => {
  const { db } = демо('2026-11-10');
  db.works.forEach(w => assert.strictEqual(w.маржа, w.цена - w.себестоимость, w.id));
  const зелёных = db.works.filter(w => w.маржа / w.цена >= 0.45).length;
  assert.ok(зелёных / db.works.length > 0.9);
  assert.strictEqual(db.works.filter(w => w.маржа < 0).length, 2);   // модели
});

test('уже в текущем формате: миграция ничего не меняет', () => {
  const { app, db } = демо('2026-11-10');
  app.setDB(db);
  assert.deepStrictEqual(app.run('мигрируй(), DB'), db);
});

test('одинаково в один день, работает на любую дату', () => {
  assert.deepStrictEqual(демо('2026-11-10').db, демо('2026-11-10').db);
  const { db } = демо('2027-01-03');
  const месяцы = new Set(db.works.map(w => w.дата.slice(0, 7)));
  assert.deepStrictEqual([...месяцы].sort(), ['2026-10', '2026-11', '2026-12', '2027-01']);
});
