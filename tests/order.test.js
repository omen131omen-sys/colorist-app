/* Заказ поставщику: кто поставщик, сколько заказать, текст и ссылка в мессенджер. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, emptyDB, mat } = require('./helpers');

const М = [
  { ...mat('bb92', 'Helen Seward', 'Краска BB 9.2', 'краска', 93, 910), остаток_г: 12 },      // мало
  { ...mat('l55', 'Helen Seward', 'Краска Lumia 5.5', 'краска', 93, 892), остаток_г: 0 },     // мало, закончилась
  { ...mat('l923', 'Helen Seward', 'Краска Lumia 9.23', 'краска', 93, 892), остаток_г: 40 },  // на исходе (≤ 45)
  { ...mat('ox6', 'Helen Seward', 'Оксид 6% · Helen Seward', 'оксид', 1050, 900), остаток_г: 20, объём_мл: 1000 },
  { ...mat('ig120', 'Schwarzkopf', 'Краска Igora 12.0', 'краска', 61, 700), остаток_г: 40 },  // на исходе, без поставщика
  { ...mat('l62', 'Helen Seward', 'Краска Lumia 6.2', 'краска', 93, 892), остаток_г: 300 },   // в норме — в заказ не идёт
];
const ПОСТ = [{ id: 'sp1', название: 'Helen Seward · дистрибьютор', бренды: ['helen seward'], канал: 'tg', контакт: '@hs_manager', подпись: 'Варя' }];
const app = loadApp(emptyDB({ materials: М, поставщики: ПОСТ }));

test('поставщик находится по бренду без учёта регистра; нет бренда — нет поставщика', () => {
  assert.equal(app.run('поставщикДля(mById("bb92"), DB.поставщики).id'), 'sp1');
  assert.equal(app.run('поставщикДля(mById("ig120"), DB.поставщики)'), null);
  assert.equal(app.run('поставщикДля({бренд:"—"}, DB.поставщики)'), null);
});

test('сколько заказать: до двойного минимума, не меньше одной упаковки', () => {
  assert.equal(app.run('сколькоЗаказать(mById("bb92"))'), 1);                       // (60−12)/93 → 1
  assert.equal(app.run('сколькоЗаказать({мин_остаток_г:100, остаток_г:0, нетто_г:93})'), 3);
  assert.equal(app.run('сколькоЗаказать(mById("l62"))'), 1);
});

test('текст заказа: без слова «Краска», у оксида — объём, подпись в конце', () => {
  const t = app.run('текстЗаказа([{m:mById("bb92"),кол:2},{m:mById("ox6"),кол:1}], "Варя, колорист")');
  assert.equal(t, 'Здравствуйте! Хочу заказать:\n• BB 9.2 — 2 уп.\n• Оксид 6% · Helen Seward, 1000 мл — 1 уп.\nСпасибо! Варя, колорист');
  assert.ok(app.run('текстЗаказа([{m:mById("bb92"),кол:1}], "")').endsWith('Спасибо!'));
});

test('ссылки: Telegram по нику и по телефону, WhatsApp с 8 → 7, почта, «поделиться»', () => {
  const ссылка = (канал, контакт) => app.run('ссылкаЗаказа(__arg, "Заказ: BB 9.2")', { канал, контакт });
  const t = encodeURIComponent('Заказ: BB 9.2');
  assert.equal(ссылка('tg', '@hs_manager'), `https://t.me/hs_manager?text=${t}`);
  assert.equal(ссылка('tg', 'https://t.me/hs_manager'), `https://t.me/hs_manager?text=${t}`);
  assert.equal(ссылка('tg', '+7 900 123-45-67'), `https://t.me/+79001234567?text=${t}`);
  assert.equal(ссылка('wa', '8 (900) 123-45-67'), `https://wa.me/79001234567?text=${t}`);
  assert.equal(ссылка('mail', 'zakaz@hs.ru'), `mailto:zakaz@hs.ru?subject=${encodeURIComponent('Заказ')}&body=${t}`);
  assert.equal(ссылка('share', ''), null);
  assert.equal(ссылка('tg', ''), null);
});

test('группы: по поставщику, без него — по бренду; «мало» первыми; в норме — не попадают', () => {
  const г = app.run('группыЗаказа(DB.materials, DB.поставщики).map(g=>[g.поставщик?g.поставщик.id:g.бренд, g.позиции.map(x=>x.m.id+(x.мало?"!":""))])');
  assert.deepEqual(г, [
    ['sp1', ['bb92!', 'l55!', 'ox6!', 'l923']],
    ['Schwarzkopf', ['ig120']],
  ]);
});

test('поставщики синхронизируются по записям, как остальные списки', () => {
  const base = emptyDB({ _updatedAt: 1, поставщики: [] });
  const local = emptyDB({ _updatedAt: 2, поставщики: [ПОСТ[0]] });
  const remote = emptyDB({ _updatedAt: 3, поставщики: [{ id: 'sp2', название: 'Estel', бренды: ['Estel'], канал: 'wa', контакт: '79000000000', подпись: '' }] });
  const ids = app.run('слитьБазы(__arg.b, __arg.l, __arg.r).поставщики.map(p=>p.id).sort()', { b: base, l: local, r: remote });
  assert.deepEqual(ids, ['sp1', 'sp2']);
});

test('старая база без поставщиков после миграции получает пустой список', () => {
  const a = loadApp(emptyDB({ materials: [] }));
  a.run('мигрируй()');
  assert.deepEqual(a.run('DB.поставщики'), []);
});
