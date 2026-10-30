/* Цех «Синхронизация»: трёхстороннее слияние баз с двух устройств. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, emptyDB, mat } = require('./helpers');

const app = loadApp();
const слить = (base, local, remote) => app.run('слитьБазы(__arg.b, __arg.l, __arg.r)', { b: base, l: local, r: remote });
const clone = o => JSON.parse(JSON.stringify(o));

const BASE = emptyDB({
  _updatedAt: 100,
  materials: [mat('m1', 'HS', 'Краска 6.2', 'краска', 93, 892, 50)],
  expenses: [{ id: 'e1', сумма: 100 }, { id: 'e2', сумма: 200 }],
  services: [{ id: 's1', название: 'Тонирование', цена_от: 3000 }],
});

test('остаток, изменённый на обоих устройствах, складывается по разнице', () => {
  const l = clone(BASE), r = clone(BASE);
  l.materials[0].остаток_г = 36;      // телефон списал 14
  r.materials[0].остаток_г = 236;     // планшет оприходовал 186
  l._updatedAt = 200; r._updatedAt = 300;
  assert.equal(слить(BASE, l, r).materials[0].остаток_г, 222);
});

test('остаток не уходит в минус', () => {
  const l = clone(BASE), r = clone(BASE);
  l.materials[0].остаток_г = 10; r.materials[0].остаток_г = 0;
  assert.equal(слить(BASE, l, r).materials[0].остаток_г, 0);
});

test('новые записи с обеих сторон остаются', () => {
  const l = clone(BASE), r = clone(BASE);
  l.works.push({ id: 'wL' }); r.works.push({ id: 'wR' });
  assert.deepEqual(слить(BASE, l, r).works.map(w => w.id), ['wL', 'wR']);
});

test('удаление с одной стороны применяется, если с другой запись не трогали', () => {
  const l = clone(BASE), r = clone(BASE);
  r.expenses = r.expenses.filter(e => e.id !== 'e1');
  l.works.push({ id: 'wL' });
  assert.deepEqual(слить(BASE, l, r).expenses.map(e => e.id), ['e2']);
});

test('правка важнее удаления', () => {
  const l = clone(BASE), r = clone(BASE);
  r.expenses = r.expenses.filter(e => e.id !== 'e1');
  l.expenses[0].сумма = 150;
  assert.deepEqual(слить(BASE, l, r).expenses.find(e => e.id === 'e1'), { id: 'e1', сумма: 150 });
});

test('разные поля одной записи с разных устройств — обе правки', () => {
  const l = clone(BASE), r = clone(BASE);
  l.services[0].цена_от = 3500;
  r.services[0].название = 'Тонирование волос';
  assert.deepEqual(слить(BASE, l, r).services[0], { id: 's1', название: 'Тонирование волос', цена_от: 3500 });
});

test('одно поле с обеих сторон — побеждает своё устройство', () => {
  const l = clone(BASE), r = clone(BASE);
  l.services[0].цена_от = 3500; r.services[0].цена_от = 4000;
  assert.equal(слить(BASE, l, r).services[0].цена_от, 3500);
});

test('без общей точки: объединение, при расхождении — более свежая база', () => {
  const l = clone(BASE), r = clone(BASE);
  l._updatedAt = 500; r._updatedAt = 400;
  l.expenses[0].сумма = 111; r.expenses[0].сумма = 222;
  r.works.push({ id: 'wR' });
  const out = слить(null, l, r);
  assert.equal(out.expenses[0].сумма, 111);
  assert.deepEqual(out.works.map(w => w.id), ['wR']);
});
