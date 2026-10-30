/* ==================== ЦЕХ «ЯДРО» ====================
   Общие кирпичи для всех экранов: справочники типов, форматирование денег/граммов/дат,
   календарные периоды (месяц со стрелками / всё время), иконки, окно-шторка (sheet),
   подтверждение и тост. Ничего не знает о складе, работах и т.д. — только инструменты.
   Подробно: docs/workshops/core.md */

/* ==================== КОНСТАНТЫ ==================== */
const LEN = {plecho:'До плеч', lopatki:'До лопаток', poyasnitsa:'До поясницы'};
const DEN = {tonkie:'Тонкие', srednie:'Средние', gustye:'Густые'};
const LEN_K = Object.keys(LEN), DEN_K = Object.keys(DEN);
const TYPE = {краска:'Краска', оксид:'Оксид / активатор', пудра:'Порошок', смывка:'Смывка', уход:'Уход'};
const TYPE_BADGE = {краска:'', оксид:'n', пудра:'a', смывка:'a', уход:'g'};
const money = v => Math.round(v).toLocaleString('ru-RU') + ' ₽';
const money1 = v => (Math.round(v*10)/10).toLocaleString('ru-RU') + ' ₽';
const uid = p => p + Math.random().toString(36).slice(2,8);

const LINE_ICONS = {
  краска:'<path d="M12 3.5s6 6.8 6 10.8a6 6 0 0 1-12 0c0-4 6-10.8 6-10.8Z"/><path d="M9.6 14.6a2.6 2.6 0 0 0 2.4 2.2"/>',
  оксид:'<path d="M9.5 3.2h5M10.8 3.2v5.2L6.7 18.4A1.6 1.6 0 0 0 8.2 20.8h7.6a1.6 1.6 0 0 0 1.5-2.4L13.2 8.4V3.2"/><path d="M8.7 14h6.6"/>',
  пудра:'<path d="M12 4.2l1.5 4.3 4.3 1.5-4.3 1.5L12 15.8l-1.5-4.3L6.2 10l4.3-1.5Z"/><path d="M17.6 15.4l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z"/>',
  уход:'<path d="M5.5 18.5C5.5 10.5 11.5 5.5 19 5.5c0 7.5-5.5 13-13 13a5 5 0 0 1-.5-.02Z"/><path d="M6 18C9 14.5 12.8 11.6 16.5 9.8"/>',
  смывка:'<path d="M9.4 3.4h5.2v3l1.6 2.2c.5.7.8 1.5.8 2.4v6.4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6.4c0-.9.3-1.7.8-2.4L9.4 6.4Z"/><path d="M7 13.2h10"/>',
  pieces:'<path d="M12 3.4 4.5 7.2v9.6L12 20.6l7.5-3.8V7.2Z"/><path d="M4.5 7.2 12 11l7.5-3.8"/><path d="M12 11v9.6"/>',
};
function gico(k){ return `<span class="gico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${LINE_ICONS[k]||''}</svg></span>`; }
/* Иконки услуг — линейный набор. Ключ хранится в service.иконка. */
const SVC_ICONS={
  капля:'<path d="M12 3.4s6.2 7 6.2 11.1a6.2 6.2 0 0 1-12.4 0c0-4.1 6.2-11.1 6.2-11.1Z"/><path d="M9.5 14.7a2.6 2.6 0 0 0 2.5 2.3"/>',
  искра:'<path d="M12 4.2l1.5 4.3 4.3 1.5-4.3 1.5L12 15.8l-1.5-4.3L6.2 10l4.3-1.5Z"/><path d="M17.6 15.4l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z"/>',
  кисть:'<path d="M15.4 3.9 20.1 8.6 11 17.7l-3.6.4.4-3.6Z"/><path d="M13.6 5.7 18.3 10.4"/><path d="M7.8 14.5 4 18.3a1.7 1.7 0 0 0 2.4 2.4l3.4-3.4"/>',
  ножницы:'<circle cx="6" cy="6.6" r="2.5"/><circle cx="6" cy="17.4" r="2.5"/><path d="M8.2 8 20 18"/><path d="M8.2 16 20 6"/>',
  лист:'<path d="M5.5 18.5C5.5 10.5 11.5 5.5 19 5.5c0 7.5-5.5 13-13 13a5 5 0 0 1-.5-.02Z"/><path d="M6 18C9 14.5 12.8 11.6 16.5 9.8"/>',
  флакон:'<path d="M9.6 3.2h4.8M11 3.2v3M13 3.2v3M8.8 9.4c0-1.7 1.3-3 3-3h.4c1.7 0 3 1.3 3 3v9a2 2 0 0 1-2 2h-2.4a2 2 0 0 1-2-2Z"/><path d="M8.8 13.4h6.4"/>',
  расческа:'<rect x="4.5" y="4.8" width="15" height="4.6" rx="1.4"/><path d="M7.2 9.4v7.8M10.4 9.4v7.8M13.6 9.4v7.8M16.8 9.4v7.8"/>',
  фен:'<path d="M13.5 4.2 4 7.2v3.6l9.5 3V4.2Z"/><path d="M13.5 6.2H18a2.4 2.4 0 0 1 0 4.8h-4.5"/><path d="M8 12.2v3.6a3 3 0 0 0 3 3h.4"/>',
};
const SVC_ICON_KEYS=Object.keys(SVC_ICONS);
function svcPaths(s){ const k=s&&s.иконка; return SVC_ICONS[k]||SVC_ICONS.капля; }
function svcSvg(s){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${svcPaths(s)}</svg>`; }
function svcCircle(s){ return `<span class="gico">${svcSvg(s)}</span>`; }
function svcInline(s){ return `<span class="sico">${svcSvg(s)}</span>`; }

/* Только календарный месяц (листается стрелками) и всё время. Скользящие «сегодня/неделя» убраны. */
const W_PERIODS=[['month','Месяц'],['all','За всё время']];
/* «Месяц» — календарный (1-е…последнее число), а не скользящие 30 дней:
   отчёт за август должен быть августом. _monthOff листает месяцы назад стрелками. */
let _monthOff=0;
const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function periodRange(p){
  const n=new Date(); n.setHours(0,0,0,0);
  if(p==='month'){
    const m=new Date(n.getFullYear(), n.getMonth()+_monthOff, 1);
    return {from:isoLocal(m), to:isoLocal(new Date(m.getFullYear(), m.getMonth()+1, 0))};
  }
  return {from:'0000-00-00', to:'9999-12-31'};
}
function periodFrom(p){ return periodRange(p).from; }
function inPeriod(дата, p){ const r=periodRange(p); return дата>=r.from && дата<=r.to; }
function monthLabel(){
  const n=new Date(); const m=new Date(n.getFullYear(), n.getMonth()+_monthOff, 1);
  return MONTHS[m.getMonth()] + (m.getFullYear()!==n.getFullYear() ? ' '+m.getFullYear() : '');
}
/* Стрелки листания месяца. Вперёд дальше текущего не пускаем. */
function shiftMonth(step, rerender){
  if(_monthOff+step>0) return;
  _monthOff+=step; document.getElementById('view').innerHTML=rerender();
}
function monthNav(rerenderName){
  return `<div class="row between" style="margin:-4px 2px 10px; align-items:center">
    <span class="iconbtn" onclick="shiftMonth(-1,${rerenderName})">‹</span>
    <span class="sm" style="font-weight:700">${monthLabel()}</span>
    <span class="iconbtn" style="${_monthOff>=0?'opacity:.3;pointer-events:none':''}" onclick="shiftMonth(1,${rerenderName})">›</span>
  </div>`;
}

/* ==================== УТИЛИТЫ ==================== */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function fmtG(g){ return (Math.round(g*10)/10).toLocaleString('ru-RU'); }
function plural(n,a,b,c){ n=Math.abs(n)%100; const n1=n%10;
  if(n>10&&n<20)return c; if(n1>1&&n1<5)return b; if(n1===1)return a; return c; }
/* Дата в ЛОКАЛЬНОМ поясе. toISOString() отдаёт UTC: восточнее Гринвича полночь уезжала
   на вчера (фильтр «Сегодня» цеплял вчерашние работы), западнее — вечер уезжал на завтра. */
function isoLocal(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayISO(){ return isoLocal(new Date()); }
/* Запись со старой датой выпадала из текущего фильтра и выглядела как несохранённая.
   Подбираем ближайший период, в котором она видна. */
function periodShowing(дата, текущий){
  if(!дата || inPeriod(дата,текущий)) return текущий;
  // запись из другого месяца — перелистываем календарь на её месяц
  const n=new Date(), d=new Date(дата+'T00:00');
  const off=(d.getFullYear()-n.getFullYear())*12 + (d.getMonth()-n.getMonth());
  if(off<=0){ _monthOff=off; return 'month'; }
  return 'all';
}
/* «1 сентября» — для фраз внутри текста, без дня недели. */
function fmtDay(iso){ const d=new Date(iso+'T00:00');
  const M=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return d.getDate()+' '+M[d.getMonth()]; }
/* Всегда конкретная дата: «Сегодня/Вчера» в журнале сбивали — непонятно, за какое число запись. */
function fmtDate(iso){ const d=new Date(iso+'T00:00');
  const m=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  return d.getDate()+' '+m[d.getMonth()]; }
function fmtDateFull(iso){
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(iso+'T00:00');
  const M=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const wd=['вс','пн','вт','ср','чт','пт','сб'][d.getDay()];
  const s=d.getDate()+' '+M[d.getMonth()]+', '+wd;
  return d.getFullYear()!==today.getFullYear() ? s+' '+d.getFullYear() : s;
}
function deepc(o){ return JSON.parse(JSON.stringify(o)); }
function blankMatrix(val){ const o={}; LEN_K.forEach(l=>{o[l]={}; DEN_K.forEach(d=>{o[l][d]=deepc(val);});}); return o; }
function emptyBox(em,t,s){ return `<div class="empty"><div class="em">${em}</div><div class="title">${t}</div><div class="sm">${s}</div></div>`; }

/* Sheet */
function openSheet(title, bodyHtml, footBtns){
  document.getElementById('sheetTitle').innerHTML=title;
  document.getElementById('sheetBody').innerHTML=bodyHtml;
  document.getElementById('sheetFoot').innerHTML=(footBtns||[]).join('');
  document.getElementById('sheetFoot').style.display=(footBtns&&footBtns.length)?'flex':'none';
  document.getElementById('sheetBg').classList.add('open');
  document.getElementById('sheet').classList.add('open');
  document.getElementById('fabWrap').style.display='none';
}
function closeSheet(){
  document.getElementById('sheetBg').classList.remove('open');
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('fabWrap').style.display='';
}
/* Своё окно подтверждения (нативный confirm() блокируется в песочнице артефакта). */
let _confirmCb=null;
function confirmDo(msg, onYes, yesLabel){
  document.getElementById('confirmMsg').textContent=msg;
  const y=document.getElementById('confirmYes'); y.textContent=yesLabel||'Удалить';
  _confirmCb=onYes;
  document.getElementById('confirmBg').classList.add('open');
}
function closeConfirm(){ document.getElementById('confirmBg').classList.remove('open'); _confirmCb=null; }
function doConfirm(){ const cb=_confirmCb; closeConfirm(); if(cb)cb(); }
let _toastT;
function toast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('show'),1800);
}
