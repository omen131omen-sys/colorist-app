/* Цех «Хранилище»: миграции старых форматов + порядок материалов на складе. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, MATERIALS, emptyDB, mat } = require('./helpers');

function migrated(db) {
  const app = loadApp(db);
  app.run('мигрируй()');
  return app;
}

test('пустые разделы создаются, нормы — по умолчанию', () => {
  const app = migrated({ materials: [], pieces: [], services: [], works: [] });
  const db = app.run('DB');
  for (const k of ['purchases', 'expenses', 'equipment']) assert.deepEqual(db[k], []);
  assert.deepEqual(db.нормы.map(n => n.id), ['nsh', 'nma', 'nko', 'nme', 'nmo']);
});

test('услуги: одна цена → вилка, рецепт удаляется', () => {
  const app = migrated(emptyDB({ services: [{ id: 's1', название: 'Консультация', цена: 500, формула: 'x' }] }));
  const s = app.run('DB.services[0]');
  assert.equal(s.цена_от, 500);
  assert.equal(s.цена_до, 0);
  assert.ok(!('цена' in s) && !('формула' in s));
});

test('типовой расход раскладывается по названию услуги, у модели — без общих', () => {
  const app = migrated(emptyDB({ services: [
    { id: 's1', название: 'Тонирование', цена_от: 3000 },
    { id: 's2', название: 'Модель', цена_от: 0 },
  ] }));
  const [тон, мод] = app.run('DB.services');
  assert.deepEqual(тон.нормы, [{ id: 'nsh', кол: 20 }, { id: 'nma', кол: 10 }, { id: 'nko', кол: 10 }]);
  assert.deepEqual(мод.нормы, [{ id: 'nmo', кол: 1 }]);
  assert.equal(мод.без_общих, true);
});

test('оксидам дописывается бренд, повторно не дублируется', () => {
  const app = migrated(emptyDB({ materials: [mat('o', 'Londa', 'Оксид 3%', 'оксид', 1000, 700)] }));
  assert.equal(app.run('DB.materials[0].название'), 'Оксид 3% · Londa');
  app.run('мигрируй()');
  assert.equal(app.run('DB.materials[0].название'), 'Оксид 3% · Londa');
});

test('«обед» из прочего переезжает в еду', () => {
  const app = migrated(emptyDB({ expenses: [{ id: 'e', категория: 'прочее', заметка: 'обед', сумма: 300, дата: '2026-09-01' }] }));
  assert.equal(app.run('DB.expenses[0].категория'), 'еда');
});

test('миграция идемпотентна: второй прогон ничего не меняет', () => {
  const app = migrated(emptyDB({ materials: MATERIALS, services: [{ id: 's', название: 'Сложное окрашивание', цена: 9000 }] }));
  const once = app.run('DB');
  app.run('мигрируй()');
  assert.deepEqual(app.run('DB'), once);
});

// На складе sortMats вызывается для каждой группы типа отдельно — так и проверяем.
const sorted = (app, тип) => app.run('sortMats(DB.materials.filter(m=>m.тип===__arg)).map(m=>m.id)', тип);

test('склад: краски от светлых к тёмным, тон как строка, корректоры 0.xx в конце', () => {
  const app = loadApp(emptyDB({ materials: MATERIALS }));
  // 9.2 < 9.23 (тон как строка); одинаковый код — по названию (BB раньше Lumia)
  assert.deepEqual(sorted(app, 'краска'), ['l1012', 'l92', 'l923', 'bb62', 'l62', 'l621', 'e066']);
});

test('склад: оксиды по проценту от слабого к сильному, равные — по названию', () => {
  const app = loadApp(emptyDB({ materials: MATERIALS }));
  assert.deepEqual(sorted(app, 'оксид'), ['ox15', 'ox6h', 'ox6l']);
});
