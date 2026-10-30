/* ==================== ЦЕХ «ОБОЛОЧКА» ====================
   Навигация по вкладкам, кнопки внизу экрана (FAB) и запуск приложения.
   Подключается ПОСЛЕДНИМ: к этому моменту все render-функции цехов уже объявлены.
   Подробно: docs/workshops/app.md */

/* ==================== НАВИГАЦИЯ ==================== */
let TAB = 'stock';
const TABS = {
  stock:   {t:'Склад', s:'Материалы и остатки', r:renderStock},
  services:{t:'Услуги', s:'Прайс-лист', r:renderServices},
  works:   {t:'Работы', s:'Журнал по дням', r:renderWorks},
  expenses:{t:'Расход', s:'Траты и оборудование', r:renderExpenses},
  report:  {t:'Отчёт', s:'Аналитика', r:renderReport},
  settings:{t:'Настройки', s:'Синхронизация и копии', r:renderSettings},
};
function go(tab){
  TAB=tab;
  document.querySelectorAll('nav.tabbar button').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.getElementById('gearBtn').classList.toggle('on', tab==='settings');
  const cfg = TABS[tab];
  hTitle.textContent = cfg.t; hSub.textContent = cfg.s;
  document.getElementById('view').innerHTML = cfg.r();
  document.getElementById('fabWrap').innerHTML = fabFor(tab);
  window.scrollTo(0,0);
}
function fabFor(tab){
  // Приход бывает после каждой закупки, новый материал — редко: ему хватит «＋».
  if(tab==='stock') return `<div class="row" style="gap:8px">
    <button class="btn" style="flex:1;width:auto" onclick="incomingSheet()">📥 Приход списком</button>
    <button class="btn ghost" style="flex:none;width:54px;padding:12px 0" onclick="editMaterial()" aria-label="Добавить материал">＋</button>
  </div>`;
  if(tab==='services') return `<button class="btn" onclick="editService()">＋ Новая услуга</button>`;
  if(tab==='works') return `<button class="btn" onclick="newWork()">＋ Работа</button>`;
  if(tab==='expenses') return `<button class="btn" onclick="editExpense()">＋ Добавить расход</button>`;
  return '';
}

/* Init */
document.querySelectorAll('nav.tabbar button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
load();
go('stock');
pullSync(); // при старте подтягиваем свежие данные с сервера (если подключён)
// Офлайн-режим при открытии по https (на file:// и в песочнице тихо пропускается)
if('serviceWorker' in navigator && location.protocol==='https:'){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
// Просим браузер не стирать хранилище при нехватке места
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
// Прячем заставку
setTimeout(()=>{ const s=document.getElementById('splash'); if(s){ s.classList.add('hide'); setTimeout(()=>s.remove(),600); } }, 950);
