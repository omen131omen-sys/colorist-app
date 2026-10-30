/* Цех «Распознавание»: формулы DIKIDI и списки покупок. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, MATERIALS, emptyDB, mat } = require('./helpers');

const app = loadApp(emptyDB({ materials: MATERIALS }));
const formula = t => app.run('parseFormulaText(__arg, DB.materials)', t)
  .map(l => ({ id: l.материал_id, г: l.граммы, канд: l.кандидаты }));
const incoming = t => app.run('parseIncomingText(__arg, DB.materials)', t)
  .map(r => ({ id: r.материал_id, уп: r.уп, г: r.граммы, сумма: r.сумма, канд: r.кандидаты }));

test('формула из DIKIDI: краски по коду, оксид по проценту, граммы в скобках', () => {
  assert.deepEqual(formula('9.23 (5гр) + 6.21 (20 гр) + 1,5% (60гр)'), [
    { id: 'l923', г: 5, канд: null },
    { id: 'l621', г: 20, канд: null },
    { id: 'ox15', г: 60, канд: null },
  ]);
});

test('код оттенка сравнивается точно: 9.2 ≠ 9.23, 10.2 ≠ 10.12', () => {
  assert.equal(formula('9.2 (10гр)')[0].id, 'l92');
  assert.deepEqual(formula('10.2 (20гр)'), [{ id: null, г: 20, канд: null }]);
});

test('один код у разных серий — кандидаты, подсказка в тексте выбирает', () => {
  assert.deepEqual(formula('6.2 (20гр)')[0], { id: null, г: 20, канд: ['l62', 'bb62'] });
  assert.equal(formula('вв 6.2 20гр')[0].id, 'bb62');        // кириллическое «вв» = BB
  assert.equal(formula('люмиа 6.2 15г')[0].id, 'l62');
});

test('десятичная запятая и граммы голым числом в конце', () => {
  assert.deepEqual(formula('вв 6,2 30'), [{ id: 'bb62', г: 30, канд: null }]);
});

test('оксид одного процента у двух брендов — уточнение по бренду', () => {
  assert.deepEqual(formula('6% (30гр)')[0].канд, ['ox6h', 'ox6l']);
  assert.equal(formula('лонда 6% 30')[0].id, 'ox6l');
});

test('пудра и уход распознаются по словам', () => {
  assert.equal(formula('пудра 40гр')[0].id, 'pwd');
  assert.equal(formula('шампунь 10')[0].id, 'shp');
});

test('разделители: плюс, перевод строки, точка с запятой', () => {
  assert.equal(formula('9.2 10гр\n6.21 5гр; 1,5% 30гр').length, 3);
});

test('больше 8 кандидатов — это шум, строка считается нераспознанной', () => {
  const many = Array.from({ length: 9 }, (_, i) => mat('x' + i, 'Бренд' + i, 'Краска 7.1', 'краска', 60, 500));
  const a = loadApp(emptyDB({ materials: many }));
  const [l] = a.run('parseFormulaText("7.1 (30гр)", DB.materials)');
  assert.equal(l.материал_id, null);
  assert.equal(l.кандидаты, null);
});

test('приход списком: упаковки, сумма, граммы из карточки', () => {
  assert.deepEqual(incoming('Lumia 6.2 — 2 шт — 1240'), [
    { id: 'l62', уп: 2, г: 186, сумма: 1240, канд: null },
  ]);
  assert.deepEqual(incoming('пудра х2 1800'), [
    { id: 'pwd', уп: 2, г: 1000, сумма: 1800, канд: null },
  ]);
});

test('приход списком: число упаковок выводится из суммы, если делится почти ровно', () => {
  assert.equal(incoming('Lumia 9.23 1784')[0].уп, 2);   // 2 × 892
  assert.equal(incoming('Lumia 9.23 1000')[0].уп, 1);   // не делится — одна упаковка
});

test('приход списком: неоднозначная позиция не достраивается', () => {
  assert.deepEqual(incoming('Оксид 6% 1 уп 450'), [
    { id: null, уп: 1, г: null, сумма: 450, канд: ['ox6h', 'ox6l'] },
  ]);
});
