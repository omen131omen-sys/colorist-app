/* ==================== ЦЕХ «ОБОЛОЧКА» ====================
   Вид «стекло» (концепт 30.10, перенесён из демо 24.11): главные экраны — Склад, Услуги, Работы,
   Расход, Отчёт, Настройки — рисуются здесь из DB. Формы — новая работа с разбором формулы, приход,
   материал, услуга, трата, нормы, оборудование — функции цехов, они открываются в стеклянной шторке.
   Круговое меню — кнопкой в углу шапки. Подключается ПОСЛЕДНИМ: здесь запуск.
   Подробно: docs/workshops/app.md, план переноса — docs/plans/2026-11-redesign.md */

let TAB='stock';
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
const fmt1=n=>(Math.round(n*10)/10).toLocaleString('ru-RU');
const svgИк=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ИК={
  stock:svgИк('<path d="M9 2.8h6v3H9z"/><path d="M8 5.8h8l1.2 3.4V19a2.2 2.2 0 0 1-2.2 2.2H9A2.2 2.2 0 0 1 6.8 19V9.2Z"/><path d="M6.8 12.5h10.4"/>'),
  services:svgИк('<circle cx="6" cy="6.6" r="2.6"/><circle cx="6" cy="17.4" r="2.6"/><path d="M8.3 8.1 20 18M8.3 15.9 20 6"/>'),
  works:svgИк('<path d="M3.5 11h17l-1.6 6.4A3.4 3.4 0 0 1 15.6 20H8.4a3.4 3.4 0 0 1-3.3-2.6Z"/><path d="M14 11 18.5 3.5"/><path d="M7 14.5c2 1 5 1 7 0"/>'),
  expenses:svgИк('<rect x="3.5" y="6.5" width="17" height="13" rx="3"/><path d="M4 7.5a2 2 0 0 1 2-2h10.5a1 1 0 0 1 1 1v1"/><path d="M15.5 12.2h3.2v3h-3.2a1.5 1.5 0 0 1 0-3Z"/>'),
  report:svgИк('<path d="M3 17c3-6 5-9 7.5-6S15 15 17 10s3-5 4-5"/><path d="M3 21h18"/>'),
  incoming:svgИк('<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M4 15v2.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V15"/>'),
  mic:svgИк('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>'),
  order:svgИк('<path d="M3.5 4.5h2.2l2 10.2h10.4l1.9-7.2H6.6"/><circle cx="9.2" cy="18.6" r="1.4"/><circle cx="16.6" cy="18.6" r="1.4"/>'),
  side:svgИк('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M20.5 8v4"/>'),
  gear:svgИк('<path d="M4 7h8M16 7h4"/><circle cx="14" cy="7" r="2.1"/><path d="M4 12h4M12 12h8"/><circle cx="10" cy="12" r="2.1"/><path d="M4 17h8M16 17h4"/><circle cx="14" cy="17" r="2.1"/>'),
  search:svgИк('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  bottle:svgИк('<path d="M10 2.8h4v3.4l2.5 2.6V19a2.2 2.2 0 0 1-2.2 2.2H9.7A2.2 2.2 0 0 1 7.5 19V8.8L10 6.2Z"/><path d="M7.5 13h9"/>'),
  foil:svgИк('<path d="M4 7.5 12 4l8 3.5-8 3.5Z"/><path d="M4 12l8 3.5 8-3.5M4 16.5 12 20l8-3.5"/>'),
  home:svgИк('<path d="M4 10.5 12 4l8 6.5V20H4Z"/><path d="M10 20v-5h4v5"/>'),
  care:svgИк('<path d="M12 3.2s6.4 7.2 6.4 11.4a6.4 6.4 0 0 1-12.8 0c0-4.2 6.4-11.4 6.4-11.4Z"/>'),
  spark:svgИк('<path d="M12 4.2l1.5 4.3 4.3 1.5-4.3 1.5L12 15.8l-1.5-4.3L6.2 10l4.3-1.5Z"/><path d="M17.6 15.4l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6Z"/>'),
  cup:svgИк('<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2.5M11 3.5v2.5"/>'),
  car:svgИк('<path d="M5 15.5V12l1.8-4.2A2 2 0 0 1 8.6 6.5h6.8a2 2 0 0 1 1.8 1.3L19 12v3.5"/><path d="M3.5 15.5h17V18h-17Z"/><path d="M5 12h14"/>'),
  card:svgИк('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>'),
  doc:svgИк('<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'),
  ads:svgИк('<path d="M4 10v4h3l6 4V6L7 10Z"/><path d="M17 9a4 4 0 0 1 0 6"/>'),
  book:svgИк('<path d="M4 5.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4Z"/><path d="M20 5.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6Z"/>'),
  dots:svgИк('<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>'),
  tools:svgИк('<path d="M14.7 6.3a3.7 3.7 0 0 0-5 5l-6 6 2 2 6-6a3.7 3.7 0 0 0 5-5l-2.2 2.2-2-2Z"/>'),
  cloud:svgИк('<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9Z"/>'),
  archive:svgИк('<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>'),
  trash:svgИк('<path d="M4.5 7h15M9.5 7V4.8h5V7"/><path d="M6.5 7l.9 12.2A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.8L17.5 7"/><path d="M10.5 11v6M13.5 11v6"/>'),
};
const ИК_КАТ={материалы:'bottle', расходники:'foil', косметика:'care', мелочь:'spark', еда:'cup', такси:'car',
  аренда:'home', кредит:'card', налог:'doc', реклама:'ads', обучение:'book', прочее:'dots'};

/* ---------- даты ---------- */
const МЕС_РОД=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const МЕС_ДАТ=['январю','февралю','марту','апрелю','маю','июню','июлю','августу','сентябрю','октябрю','ноябрю','декабрю'];
const ДЕНЬ_НЕД=['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const ДН=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
function датаСлово(iso){ const d=iso?new Date(iso+'T00:00'):new Date(); return ДЕНЬ_НЕД[d.getDay()]+', '+d.getDate()+' '+МЕС_РОД[d.getMonth()]; }
function приветствие(){ const h=new Date().getHours(); return h<5?'Доброй ночи':h<12?'Доброе утро':h<17?'Добрый день':'Добрый вечер'; }
function сдвигДня(iso,n){ const d=new Date(iso+'T00:00'); d.setDate(d.getDate()+n); return isoLocal(d); }
function месяцДиапазон(off){
  const n=new Date(), a=new Date(n.getFullYear(), n.getMonth()+off, 1), b=new Date(a.getFullYear(), a.getMonth()+1, 0);
  return {from:isoLocal(a), to:isoLocal(b), d:a, дней:b.getDate()};
}
function месяцСмещение(iso){
  const n=new Date(), d=new Date(iso+'T00:00');
  return Math.min(0, (d.getFullYear()-n.getFullYear())*12 + d.getMonth()-n.getMonth());
}

/* ---------- материал: уровень тона, подписи, цвет образца ---------- */
const ТОН=['#1e1511','#30211a','#452e22','#5c3f2d','#77533a','#96704c','#b48c62','#cfab7f','#e2c79e','#f1e0bd'];
const тон=l=>ТОН[Math.max(1,Math.min(10,l))-1];
const УРОВЕНЬ=['','чёрный','тёмно-коричневый','коричневый','светло-коричневый','светлый шатен','тёмно-русый','русый','светло-русый','блондин','светлый блондин'];
function уровень(m){
  if(m.тип!=='краска') return null;
  const c=_matCode(m); if(!c) return null;
  const l=parseInt(c.split('.')[0],10);
  return l>=1 && l<=10 ? l : null;      // корректоры 0.xx — без уровня
}
/* Краска без распознанного номера («Прямой пигмент розовый (Estel)», «Краска OLLIN 0/0»):
   крупно — последнее слово, оно и отличает (цвет, 0/0, BBC18); остальное — в строку с брендом.
   Иначе крупная подпись повторяла строку под ней и обрезалась на «Прямой пигм…». */
function _безНомера(m){
  const бренд=(m.бренд&&m.бренд!=='—')?m.бренд:'';
  let s=m.название.split('·')[0].replace(/^краска\s+/i,'').replace(/\([^)]*\)/g,' ');
  if(бренд) s=s.replace(new RegExp('(^|\\s)'+бренд.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s|$)','ig'),' ');
  const слова=s.trim().split(/\s+/).filter(Boolean);
  if(!слова.length) return null;
  const последнее=слова.pop();
  return {оттенок:последнее.charAt(0).toUpperCase()+последнее.slice(1), серия:слова.join(' '), слово:последнее};
}
/* Пигменты и тонеры с цветом в названии («Прямой пигмент розовый»): цвет показывает кружок,
   слово «Розовый» крупно не пишем. Тройка — светлый блик, основной, тень, как у кружков краски. */
const ЦВЕТ_ПИГМЕНТА=[
  [/^ж[её]лт/,'#fff0a8','#f2c12e','#b7860c'], [/^оранж/,'#ffd2a0','#f08a24','#a9540a'],
  [/^красн/,'#ffb0a8','#d8342e','#8e1712'], [/^малинов/,'#ffb3cf','#c8326e','#7e1440'],
  [/^розов/,'#ffd0e4','#e8599c','#a42a62'], [/^(фиолет|лилов|сирен)/,'#e2c8ff','#8e55c9','#552a85'],
  [/^син/,'#b9cdff','#2f5ccc','#162f7a'], [/^голуб/,'#d2efff','#4aa8e0','#1d6c9e'],
  [/^бирюз/,'#bff3ec','#1fb0a6','#0b6d66'], [/^зел[её]н/,'#c4efd2','#2f9e5a','#16613a'],
  [/^медн/,'#f6c9a6','#c0682e','#7a3c14'], [/^коричн/,'#d9b49a','#7b4a2b','#432614'],
  [/^ч[её]рн/,'#8a8a8a','#2a2a2a','#0c0c0c'], [/^сер(ый|ая|ое|ебр)/,'#f1f2f4','#a9adb4','#6c7078'],
];
function цветПигмента(m){
  if(m.тип!=='краска' || _matCode(m)) return null;
  const б=_безНомера(m); if(!б) return null;
  const w=б.слово.toLowerCase();
  return ЦВЕТ_ПИГМЕНТА.find(([re])=>re.test(w)) || null;
}
function оттенокМ(m){                     // крупная подпись на карточке
  if(m.тип==='краска'){ const c=_matCode(m); if(c) return c; if(цветПигмента(m)) return ''; const б=_безНомера(m); if(б) return б.оттенок; }
  if(m.тип==='оксид'){ const p=_matPct(m); if(p) return p.replace('.',',')+' %'; }
  if(m.тип==='пудра') return 'Пудра';
  if(m.тип==='смывка') return 'Смывка';
  return m.название.split('·')[0].replace(/\s*шаг\s*/i,' ').trim();
}
function линейка(m){                      // строка под подписью: серия и бренд
  const бренд=(m.бренд&&m.бренд!=='—')?m.бренд:'';
  if(/^корректор/i.test(m.название)) return ['Корректор',бренд].filter(Boolean).join(' · ');
  if(m.тип==='краска'){
    const б=!_matCode(m)&&_безНомера(m);
    const серия=б ? б.серия : m.название.replace(/^краска\s*/i,'').replace(_matCode(m)||'','').trim();
    return [серия,бренд].filter(Boolean).join(' · ') || TYPE[m.тип];
  }
  if(m.тип==='оксид') return ['Оксид',бренд].filter(Boolean).join(' · ');
  return бренд || TYPE[m.тип];
}
function образец(m){
  const п=цветПигмента(m);
  if(п) return `radial-gradient(circle at 35% 30%,${п[1]},${п[2]} 60%,${п[3]})`;
  const l=уровень(m);
  if(l) return `radial-gradient(circle at 35% 30%,${тон(Math.min(10,l+2))},${тон(l)} 60%,${тон(Math.max(1,l-2))})`;
  const c=_matCode(m)||'';
  if(/^0\.[67]/.test(c)) return 'radial-gradient(circle at 35% 30%,#dcbfe4,#8a5a9a 60%,#4e2d5c)';
  if(/^0\.[12]/.test(c)) return 'radial-gradient(circle at 35% 30%,#dde4ec,#7b8aa0 60%,#4a5566)';
  if(m.тип==='пудра') return 'radial-gradient(circle at 35% 30%,#ffffff,#e4e8ee 60%,#b9c2cf)';
  if(m.тип==='смывка') return 'radial-gradient(circle at 35% 30%,#fffbe8,#efe2b8 60%,#cbb98a)';
  if(m.тип==='уход') return 'radial-gradient(circle at 35% 30%,#fff3f0,#ecd2cc 60%,#c9a8a0)';
  return 'radial-gradient(circle at 35% 30%,#ffffff,#e9e2da 60%,#c9bdb1)';
}
function цветШтрихов(m){
  if(stockState(m).badge==='r') return '#b4573f';
  const l=уровень(m); if(l) return тон(Math.min(9,Math.max(4,l)));
  const c=_matCode(m)||'';
  if(/^0\.[67]/.test(c)) return '#8a5a9a';
  if(/^0\.[12]/.test(c)) return '#7b8aa0';
  return '#7a6a5d';
}
const штрихи=(f,n,col)=>{ let s=''; for(let i=0;i<n;i++){ const on=i<Math.round(f*n);
  s+=`<i class="${on?'on':''}" style="${on?'background:'+col:''}"></i>`; } return `<div class="ticks">${s}</div>`; };
const упаковок=m=>m.остаток_г/(m.нетто_г||1);
const подписьУпаковки=m=>упаковок(m)>1.05 ? '≈ '+fmt1(упаковок(m))+' уп.' : 'из '+fmtG(m.нетто_г);
const хватит=m=>хватитДней(m, DB.works, todayISO());

/* ---------- оболочка ---------- */
const ВКЛАДКИ=[['stock','Склад'],['services','Услуги'],['works','Работы'],['expenses','Расход'],['report','Отчёт']];
const ЭКРАНЫ={stock:экранСклад, services:экранУслуги, works:экранРаботы, expenses:экранРасход, report:экранОтчёт, settings:экранНастройки};
const шапка=()=>`<div class="top"><div class="mark"><b></b>Колорист</div>
  <div style="display:flex;gap:8px">
    <button class="round" onclick="открытьМеню()" aria-label="Быстрое меню">${ИК.side}</button>
    <button class="round${TAB==='settings'?' on':''}" onclick="go(TAB==='settings'?'stock':'settings')" aria-label="Настройки">${ИК.gear}</button>
  </div></div>`;
/* Формы цехов после сохранения зовут go('works') и т.п. — сюда же и попадают.
   оставитьПрокрутку — для перерисовки «на месте» (фильтр, правка граммов): без прыжка наверх. */
function go(tab, оставитьПрокрутку){
  if(!ЭКРАНЫ[tab]) tab='stock';
  TAB=tab;
  document.getElementById('tabbar').innerHTML=ВКЛАДКИ.map(([k,l])=>
    `<button class="tab ${k===tab?'on':''}" onclick="go('${k}')">${ИК[k]}${l}</button>`).join('');
  const sc=document.getElementById('screen'), y=sc.scrollTop;
  sc.innerHTML=`<div class="view${оставитьПрокрутку?' still':''}">${шапка()}${ЭКРАНЫ[tab]()}</div>`;
  sc.scrollTop=оставитьПрокрутку?y:0;
}

/* ==================== СКЛАД ==================== */
let _кат='все', _поиск='';
const наИсходе=m=>{ const b=stockState(m).badge; return b==='r'||b==='a'; };
const КАТЕГОРИИ=[['все','Все'],['исход','На исходе'],['краска','Краска'],['оксид','Оксид'],['пудра','Порошок'],['смывка','Смывка'],['уход','Уход']];
function экранСклад(){
  const mats=DB.materials;
  const всего=mats.reduce((s,m)=>s+m.остаток_г*gpr(m),0);
  const мало=mats.filter(m=>stockState(m).badge==='r').length;
  const поУр=Array.from({length:10},(_,i)=>mats.filter(m=>уровень(m)===i+1).reduce((s,m)=>s+m.остаток_г,0));
  const max=Math.max(...поУр,1);
  const шкала=поУр.map((g,i)=>`<div class="lv ${g?'on':''}"><span style="height:${g?18+62*g/max:10}px;${
    g?`background:${тон(i+1)};box-shadow:0 0 14px ${тон(i+1)}66`:''}"></span><em>${i+1}</em></div>`).join('');
  // чипы — только те типы, что есть на складе: пустая «Смывка» — лишнее нажатие.
  // «На исходе» — и красные «мало», и жёлтые «на исходе»: то же слово, что на карточке.
  const чипы=КАТЕГОРИИ.filter(([k])=>k==='все' || (k==='исход'?mats.some(наИсходе):mats.some(m=>m.тип===k)));
  if(!чипы.find(([k])=>k===_кат)) _кат='все';
  let h=`<div class="hello"><div><div class="eyebrow">${датаСлово()}</div><div class="h1">${приветствие()}</div></div></div>
    <div class="dark">
      <div class="cap"><span>Склад на сумму</span>${мало
        ?`<button class="pill" onclick="открытьЗаказ()"><i class="dot low"></i>${мало} к заказу</button>`
        :`<span class="pill"><i class="dot"></i>всё в норме</span>`}</div>
      <div class="num hero" style="font-size:56px;margin-top:14px">${fmt(всего)}<small>₽</small></div>
      <div class="levels">${шкала}</div>
    </div>
    <label class="search">${ИК.search}<input id="st_q" type="search" placeholder="Поиск" value="${esc(_поиск)}"
      oninput="_поиск=this.value;обновитьСклад()" autocomplete="off" enterkeyhint="search">
      <button class="x" style="${_поиск?'':'visibility:hidden'}" onclick="event.preventDefault();_поиск='';go('stock',true)" aria-label="Очистить">✕</button></label>
    <div class="chips">${чипы.map(([k,l])=>`<button class="chip ${k===_кат?'on':''}" onclick="_кат='${k}';go('stock',true)">${l}</button>`).join('')}</div>
    <div id="st_grid">${сеткаМатериалов()}</div>`;
  h+=`<div class="ctas dock"><button class="cta light" onclick="editMaterial()">＋ Материал</button>
      <button class="cta" onclick="incomingSheet()">Приход списком</button></div>`;
  return h;
}
function сеткаМатериалов(){
  const mats=DB.materials, q=_поиск.trim().toLowerCase();
  let список=sortMats(mats.filter(m=>
    (_кат==='все' || (_кат==='исход' ? наИсходе(m) : m.тип===_кат)) &&
    (!q || (m.название+' '+m.бренд+' '+TYPE[m.тип]).toLowerCase().includes(q))));
  // в «На исходе» сначала красные «мало» — их заказывать первыми; внутри — порядок палитры
  if(_кат==='исход') список=[...список.filter(m=>stockState(m).badge==='r'), ...список.filter(m=>stockState(m).badge!=='r')];
  if(список.length) return `<div class="grid">${список.map(карточкаМатериала).join('')}</div>`;
  return `<div class="glass empty"><div class="em">📦</div>${q?`Ничего не найдено по «${esc(_поиск)}»`:mats.length?'Здесь пусто':'Склад пуст'}</div>`;
}
// Поиск перерисовывает только сетку: иначе поле пересоздаётся и клавиатура на телефоне закрывается
function обновитьСклад(){
  const g=document.getElementById('st_grid'); if(g) g.innerHTML=сеткаМатериалов();
  const x=document.querySelector('.search .x'); if(x) x.style.visibility=_поиск?'':'hidden';
}
function карточкаМатериала(m){
  const st=stockState(m), ш=оттенокМ(m), дн=хватит(m);
  // Номер — в одной строке с кружком: так карточка ниже. Плашке статуса рядом с номером
  // в полэкрана места нет — она встаёт вместо «из 93» (сколько осталось, и так видно по шкале).
  const плашка=st.badge==='r'?'<span class="pill low">мало</span>':st.badge==='a'?'<span class="pill warn">на исходе</span>':'';
  return `<button class="glass mat" onclick="matSheet('${m.id}')">
    <div><div class="row"><span class="swatch" style="background:${образец(m)}"></span>${ш?`<span class="shade${ш.length>6||/[a-zа-яё]{3}/i.test(ш)?' long':''}">${esc(ш)}</span>`:''}</div>
      <div class="brand">${esc(линейка(m))}</div></div>
    ${штрихи(Math.min(1,упаковок(m)),18,цветШтрихов(m))}
    <div class="left"><b class="${st.badge==='r'?'low':st.badge==='a'?'warn':''}">${fmtG(m.остаток_г)} г</b>${плашка||`<span>${подписьУпаковки(m)}</span>`}</div>
    ${дн?`<div class="fc${дн<=14?' soon':''}">${подписьХватит(дн)}</div>`:''}
  </button>`;
}

/* Карточка материала: дуга остатка, шкала тона, на сколько хватит. Заменяет matSheet склада. */
const шагПравки=m=>m.тип==='краска'?5:m.тип==='оксид'?50:10;
function средняяПорция(m){
  let n=0,g=0;
  DB.works.forEach(w=>(w.шаги||[]).forEach(s=>{ if(s.материал_id===m.id){ n++; g+=s.факт_граммы||0; } }));
  return n?g/n:0;
}
function дуга(m){
  const n=46,cx=150,cy=150,a0=-115,a1=115,f=Math.min(1,упаковок(m)),l=уровень(m),low=stockState(m).badge==='r';
  let s='';
  for(let i=0;i<n;i++){
    const a=(a0+(a1-a0)*i/(n-1))*Math.PI/180, on=i/(n-1)<=f+1e-9;
    const r0=on?104:110, r1=on?128:122;
    const col=on?(low?'#b4573f':(l?тон(Math.round(3+i/(n-1)*Math.max(1,l-2))):цветШтрихов(m))):'rgba(39,30,25,.18)';
    s+=`<line x1="${cx+r0*Math.sin(a)}" y1="${cy-r0*Math.cos(a)}" x2="${cx+r1*Math.sin(a)}" y2="${cy-r1*Math.cos(a)}" stroke="${col}" stroke-width="${on?3:2}" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 300 210" role="img" aria-label="Остаток ${fmtG(m.остаток_г)} г">${s}</svg>`;
}
function matSheet(id){
  const m=mById(id); if(!m) return;
  const st=stockState(m), l=уровень(m), порция=средняяПорция(m), шаг=шагПравки(m), дн=хватит(m);
  const цвет=st.badge==='r'?'var(--red)':st.badge==='a'?'var(--amber)':'var(--green)';
  // «Хватит»: по темпу расхода, если он есть; иначе — сколько средних порций в остатке
  const прогноз = дн!=null
    ? (дн<=0 ? `<div class="num">0</div><div class="note">закончился</div>`
             : `<div class="num"${срокХватит(дн).length>8?' style="font-size:23px"':''}>${срокХватит(дн)}</div><div class="note">хватит</div>`)
    : порция ? `<div class="num">${Math.floor(m.остаток_г/порция)}</div><div class="note">${plural(Math.floor(m.остаток_г/порция),'работа','работы','работ')} по ${fmtG(Math.round(порция))} г</div>`
    : `<div class="num">—</div><div class="note">ещё не расходовался</div>`;
  const ш=оттенокМ(m), б=!ш&&_безНомера(m);
  openSheet(`<span class="eyebrow">${esc(б?(m.бренд||''):линейка(m))}</span><span class="swatch" style="background:${образец(m)}"></span>${esc(б?б.серия:ш)}`, `
    <div class="gauge">${дуга(m)}
      <div class="val"><div class="num">${fmtG(m.остаток_г)}<small>г</small></div>
        <div>${упаковок(m)>1.05?'≈ '+fmt1(упаковок(m))+' уп. по '+fmtG(m.нетто_г)+' г':'из '+fmtG(m.нетто_г)+' г в упаковке'}</div></div>
    </div>
    <!-- − и + под шкалой, а не на ней: в концепте кнопки накрывали её концы -->
    <div class="adjust">
      <button class="pm" onclick="подправить('${id}',-1)" aria-label="Меньше на ${шаг} г">−</button>
      <div class="sm muted">± ${шаг} г</div>
      <button class="pm" onclick="подправить('${id}',1)" aria-label="Больше на ${шаг} г">+</button>
    </div>
    ${l?`<div class="eyebrow">Уровень тона · ${l}, ${УРОВЕНЬ[l]}</div>
      <div class="tscale">${ТОН.map((c,i)=>`<div class="${i+1===l?'on':''}"><span style="background:${c}"></span>${i+1}</div>`).join('')}</div>`:''}
    <div class="stats">
      <div class="stat"><div class="num">${fmt1(gpr(m))}<small>₽/г</small></div><div class="note">себестоимость</div></div>
      <div class="stat">${прогноз}</div>
    </div>
    <div class="card">
      <div class="kv"><span class="k">Статус</span><span class="v" style="color:${цвет}">${st.txt}</span></div>
      <div class="kv"><span class="k">Упаковка</span><span class="v">${m.объём_мл?m.объём_мл+' мл · ':''}${fmtG(m.нетто_г)} г · ${money(m.цена_упаковки)}</span></div>
      ${m.тара_г?`<div class="kv"><span class="k">Пустая тара</span><span class="v">${m.тара_г} г</span></div>`:''}
      <div class="kv"><span class="k">Мин. остаток</span><span class="v">${m.мин_остаток_г} г</span></div>
      <div class="kv"><span class="k">Стоимость остатка</span><span class="v">${money(m.остаток_г*gpr(m))}</span></div>
    </div>`,
    [`<button class="btn ghost" onclick="editMaterial('${id}')">Изменить</button>`,
     `<button class="btn" onclick="restockMat('${id}')">Приход</button>`]);
}
function подправить(id, знак){
  const m=mById(id); if(!m) return;
  const было=m.остаток_г;
  m.остаток_г=Math.max(0, Math.round((m.остаток_г+знак*шагПравки(m))*10)/10);
  if(m.остаток_г===было) return;
  save();
  const тело=document.getElementById('sheetBody'), y=тело.scrollTop;
  matSheet(id); тело.scrollTop=y;
  if(TAB==='stock') go('stock',true);
}

/* ==================== УСЛУГИ ==================== */
function экранУслуги(){
  const C=2*Math.PI*23;
  let h=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="tg">
      <stop offset="0" stop-color="#5c3f2d"/><stop offset="1" stop-color="#e2c79e"/></linearGradient></defs></svg>
    <div class="hello"><div><div class="h1">Услуги</div></div></div>`;
  if(!DB.services.length) h+=`<div class="glass empty"><div class="em">✂️</div>Услуг пока нет</div>`;
  h+=DB.services.map(s=>{
    const st=svcStats(s);
    const типовая=Math.round(снимокНорм(нормыУслуги(s)).reduce((x,n)=>x+нормаСумма(n),0));
    const себест=st&&st.mn ? Math.round(st.cost/st.mn) : типовая;
    const цена=st&&st.mn ? st.mRev : svcFrom(s), маржа=st&&st.mn ? st.marg : svcFrom(s)-себест;
    const mg=цена?маржа/цена:0;
    const a=svcFrom(s), b=svcTo(s);
    return `<button class="glass svc" onclick="svcSheet('${s.id}')">
      <div class="row"><div style="min-width:0"><div class="t">${esc(s.название)}</div>
        <div class="s">${svcTimeText(s)}${st?` · ${st.n} ${plural(st.n,'работа','работы','работ')} · ср. чек ${fmt(st.avg)} ₽`:' · ещё не проводилась'}</div></div>
        <div class="marg"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="23" fill="none" stroke="rgba(39,30,25,.12)" stroke-width="4"/>
          <circle cx="27" cy="27" r="23" fill="none" stroke="url(#tg)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C*Math.max(0,Math.min(1,mg))} ${C}"/></svg>
          <b style="color:${margLevel(маржа,цена).c}">${Math.round(mg*100)}%</b></div></div>
      <div class="money"><div class="num">${b>a?fmt(a)+'–'+fmt(b):fmt(a)}<small>₽</small></div><span>себестоимость ≈ ${fmt(себест)} ₽</span></div>
    </button>`;
  }).join('');
  h+=`<button class="cta" onclick="editService()">＋ Новая услуга</button>`;
  return h;
}

/* ==================== РАБОТЫ ==================== */
let _день=null;   // выбранный день журнала
function деньПоУмолчанию(){
  const t=todayISO(), было=DB.works.map(w=>w.дата).filter(d=>d<=t).sort();
  return было.length ? было[было.length-1] : t;
}
function экранРаботы(){
  const t=todayISO();
  if(!_день) _день=деньПоУмолчанию();
  const d=new Date(_день+'T00:00');
  const пн=сдвигДня(_день, -((d.getDay()+6)%7));
  const неделя=Array.from({length:7},(_,i)=>сдвигДня(пн,i));
  const сРаботами=new Set(DB.works.map(w=>w.дата));
  const работы=DB.works.filter(w=>w.дата===_день);
  const выручка=работы.reduce((s,w)=>s+(w.цена||0),0);
  const заМесяц=DB.works.filter(w=>w.дата.slice(0,7)===_день.slice(0,7));
  const месяц=MONTHS[d.getMonth()].toLowerCase();
  const подпись=_день===t?'Сегодня':_день===сдвигДня(t,-1)?'Вчера':датаСлово(_день);
  let h=`<div class="hello"><div><div class="eyebrow">${месяц} ${d.getFullYear()}</div><div class="h1">Работы</div></div>
      <div class="r"><button class="round sm" onclick="листатьНеделю(-1)" aria-label="Прошлая неделя">‹</button>
        <button class="round sm" ${сдвигДня(пн,7)<=t?'':'disabled'} onclick="листатьНеделю(1)" aria-label="Следующая неделя">›</button></div></div>
    <div class="days">${неделя.map(x=>{ const dd=new Date(x+'T00:00');
      return `<button class="day${x===_день?' on':''}${сРаботами.has(x)?' has':''}${x>t?' fut':''}" onclick="выбратьДень('${x}')">${ДН[dd.getDay()]}<b>${dd.getDate()}</b></button>`; }).join('')}</div>
    <div class="dark">
      <div class="cap"><span>${подпись}</span><span class="pill"><i class="dot"></i>${работы.length} ${plural(работы.length,'работа','работы','работ')}</span></div>
      <div class="num hero" style="font-size:44px;margin-top:10px">${fmt(выручка)}<small>₽</small></div>
      <div class="sub">За ${месяц}: ${fmt(заМесяц.reduce((s,w)=>s+(w.цена||0),0))} ₽ · ${заМесяц.length} ${plural(заМесяц.length,'работа','работы','работ')}</div>
    </div>`;
  h+= работы.length ? работы.map(карточкаРаботы).join('')
    : `<div class="glass" style="text-align:center;color:var(--ink-2)">В этот день работ нет</div>`;
  h+=`<button class="cta" onclick="работаНаДень()">＋ Работа</button>`;
  return h;
}
function карточкаРаботы(w){
  const lvl=margLevel(w.маржа, w.цена), pct=w.цена?Math.round(w.маржа/w.цена*100):0;
  const чипы=(w.шаги||[]).map(s=>{ const m=mById(s.материал_id);
    return `<span class="fchip"><i style="background:${m?образец(m):'#ccc'}"></i>${esc(m?(оттенокМ(m)||(_безНомера(m)||{}).серия||m.название):s.название)} · ${fmtG(s.факт_граммы)} г</span>`; }).join('');
  // до MARG_FROM себестоимость не вели — маржа там была бы «100 %», показываем только чек
  const итог = margCounted(w)
    ? `<span>Материалы <b>${fmt(w.себестоимость||0)} ₽</b></span><span>Чек <b>${fmt(w.цена)} ₽</b></span>
       <span>Маржа <b style="color:${lvl.c}">${pct}%</b></span>`
    : `<span>Чек <b>${fmt(w.цена)} ₽</b></span><span>себестоимость тогда не считалась</span>`;
  return `<button class="glass work" onclick="workSheet('${w.id}')">
    <div class="head"><span class="time">${w.время?fmtHrs(w.время):'—'}</span><span class="who">${esc(w.услуга_назв)}</span></div>
    ${w.без_склада?'<div class="what">внесена задним числом — склад не списывался</div>':чипы?'':'<div class="what">без материалов</div>'}
    ${чипы?`<div class="formula">${чипы}</div>`:''}
    <div class="foot">${итог}</div>
  </button>`;
}
function листатьНеделю(n){ _день=сдвигДня(_день,7*n); if(_день>todayISO()) _день=todayISO(); go('works',true); }
function выбратьДень(x){ if(x>todayISO()) return toast('Этот день ещё не наступил'); _день=x; go('works',true); }
/* Новая работа ложится на выбранный в журнале день — так удобно вносить прошлые. */
function работаНаДень(){
  newWork();
  if(_nw && _день && _день<=todayISO() && _день!==_nw._date){ _nw._date=_день; drawNewWork(); }
}
// После сохранения журнал показывает день этой работы
const _сохранитьРаботу=saveWork;
saveWork=function(){ if(_nw && _nw._date) _день=_nw._date; return _сохранитьРаботу(); };

/* ==================== РАСХОД ==================== */
let _мес=0;                    // 0 — текущий месяц, −1 — прошлый… Общий для Расхода и Отчёта
let _расхКат='расходники';
function листатьМесяц(n){ _мес=Math.min(0,_мес+n); go(TAB,true); }
function навМесяца(){
  return `<div class="r"><button class="round sm" onclick="листатьМесяц(-1)" aria-label="Прошлый месяц">‹</button>
    <button class="round sm" ${_мес>=0?'disabled':''} onclick="листатьМесяц(1)" aria-label="Следующий месяц">›</button></div>`;
}
function экранРасход(){
  const r=месяцДиапазон(_мес), назв=MONTHS[r.d.getMonth()];
  const list=(DB.expenses||[]).filter(e=>e.дата>=r.from && e.дата<=r.to).sort((a,b)=>b.дата.localeCompare(a.дата));
  const итог=list.reduce((s,e)=>s+(e.сумма||0),0);
  return `<div class="hello"><div><div class="eyebrow">${назв}${r.d.getFullYear()!==new Date().getFullYear()?' '+r.d.getFullYear():''} · ${fmt(итог)} ₽</div><div class="h1">Расход</div></div>${навМесяца()}</div>
    <div class="dark">
      <div class="cap"><span>Новый расход</span><span class="pill">сегодня</span></div>
      <label class="amount"><input id="qa_sum" inputmode="decimal" placeholder="0" aria-label="Сумма"><span>₽</span></label>
    </div>
    <div class="chips">${EXP_MANUAL_CATS.map(k=>`<button class="chip ${k===_расхКат?'on':''}" onclick="выбратьКатегорию(this,'${k}')">${EXP_CATS[k]}</button>`).join('')}</div>
    <label class="field">Что купили<input id="qa_note"></label>
    <button class="cta" onclick="быстрыйРасход()">Добавить расход</button>
    <button class="glass item" onclick="equipSheet()"><span class="ico">${ИК.tools}</span>
      <div class="main"><div class="t">Оборудование</div><div class="s">${(DB.equipment||[]).length} поз. · вложено ${fmt(equipTotal())} ₽</div></div><span class="chev">›</span></button>
    <div class="hello" style="padding:6px 2px 0"><div class="eyebrow">Траты за ${назв.toLowerCase()} · ${list.length}</div></div>
    <div class="list">${list.map(строкаРасхода).join('') || '<div class="glass" style="text-align:center;color:var(--ink-2)">В этом месяце трат нет</div>'}</div>`;
}
function выбратьКатегорию(el,k){ _расхКат=k; el.parentNode.querySelectorAll('.chip').forEach(b=>b.classList.toggle('on',b===el)); }
function быстрыйРасход(){
  const сумма=+String(document.getElementById('qa_sum').value).replace(',','.').replace(/\s/g,'')||0;
  if(сумма<=0) return toast('Введите сумму');
  const заметка=document.getElementById('qa_note').value.trim() || EXP_CATS[_расхКат];
  DB.expenses.push({id:uid('e'), категория:_расхКат, сумма:Math.round(сумма), дата:todayISO(), заметка});
  _мес=0; save(); go('expenses',true);
  toast('Расход '+money(сумма)+' добавлен');
}
function строкаРасхода(e){
  const сосклада=e.категория==='материалы' && e.материал_id;
  return `<button class="glass item" onclick="${сосклада?`закупкаSheet('${e.id}')`:`editExpense('${e.id}')`}">
    <span class="ico">${ИК[ИК_КАТ[e.категория]]||ИК.dots}</span>
    <div class="main"><div class="t">${esc(e.заметка||EXP_CATS[e.категория]||'Расход')}</div>
      <div class="s">${EXP_CATS[e.категория]||esc(e.категория)}${сосклада?' · со склада':''} · ${fmtDate(e.дата)}</div></div>
    <div class="num" style="font-size:21px;font-weight:400;flex:none">−${fmt(e.сумма)}</div></button>`;
}
/* Закупку со склада правят через Склад, здесь — посмотреть и при ошибке удалить с откатом. */
function закупкаSheet(id){
  const e=(DB.expenses||[]).find(x=>x.id===id); if(!e) return;
  const m=mById(e.материал_id);
  openSheet('Закупка', `<div class="card">
      <div class="kv"><span class="k">Позиция</span><span class="v">${esc(m?m.название:e.заметка)}</span></div>
      <div class="kv"><span class="k">Дата</span><span class="v">${fmtDay(e.дата)}</span></div>
      <div class="kv"><span class="k">Сумма</span><span class="v">${money(e.сумма)}</span></div>
      ${e.граммы?`<div class="kv"><span class="k">Пришло на склад</span><span class="v">${fmtG(e.граммы)} г</span></div>`:''}
      ${e.цена_до!=null&&e.цена_до!==e.цена_после?`<div class="kv"><span class="k">Цена упаковки</span><span class="v">${money(e.цена_до)} → ${money(e.цена_после)}</span></div>`:''}
    </div>`,
    [`<button class="btn danger wauto" onclick="delExpense('${id}')">🗑</button>`,
     `<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`]);
}
const _сохранитьТрату=saveExpense;
saveExpense=function(id){ const d=(document.getElementById('ex_date')||{}).value; if(d) _мес=месяцСмещение(d); return _сохранитьТрату(id); };

/* ==================== ОТЧЁТ ==================== */
function кривая(значения, подписи, лучший){
  const W=320,H=150,P=14, max=Math.max(...значения,1)*1.15, n=значения.length;
  const pts=значения.map((v,i)=>[P+i*(W-2*P)/(n-1), H-12-(v/max)*(H-34)]);
  let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=0;i<n-1;i++){ const [x0,y0]=pts[i],[x1,y1]=pts[i+1],mx=(x0+x1)/2; d+=` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`; }
  const [hx,hy]=pts[лучший];
  const сетка=[.25,.5,.75].map(f=>`<line x1="0" x2="${W}" y1="${H-12-f*(H-34)}" y2="${H-12-f*(H-34)}" stroke="rgba(245,236,227,.1)" stroke-dasharray="2 4"/>`).join('');
  const tx=Math.min(W-30, Math.max(30, hx));
  return `<svg class="chart" viewBox="0 0 ${W} ${H+16}" role="img" aria-label="Выручка по дням месяца">
    <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7c785" stop-opacity=".35"/><stop offset="1" stop-color="#e7c785" stop-opacity="0"/></linearGradient></defs>
    ${сетка}
    <path d="${d} L${pts[n-1][0]} ${H-12} L${pts[0][0]} ${H-12}Z" fill="url(#ar)"/>
    <path d="${d}" fill="none" stroke="#f5ece3" stroke-width="1.6"/>
    <line x1="${hx}" x2="${hx}" y1="${hy}" y2="${H-12}" stroke="#e7c785" stroke-dasharray="2 3"/>
    <circle cx="${hx}" cy="${hy}" r="9" fill="#e7c785" opacity=".25"/><circle cx="${hx}" cy="${hy}" r="4.5" fill="#e7c785"/>
    <text x="${tx}" y="${Math.max(12,hy-16)}" text-anchor="middle" fill="#f5ece3" font-size="12" font-family="Manrope,sans-serif" font-weight="700">${fmt(значения[лучший])} ₽</text>
    ${pts.map((p,i)=>подписи[i]?`<text x="${p[0]}" y="${H+12}" text-anchor="middle" fill="#d4c6b8" font-size="11.5" font-weight="600" font-family="Manrope,sans-serif">${подписи[i]}</text>`:'').join('')}
  </svg>`;
}
function экранОтчёт(){
  const r=месяцДиапазон(_мес), текущий=_мес===0;
  const ws=DB.works.filter(w=>w.дата>=r.from && w.дата<=r.to);
  const ex=(DB.expenses||[]).filter(e=>e.дата>=r.from && e.дата<=r.to);
  const rev=ws.reduce((s,w)=>s+(w.цена||0),0), spend=ex.reduce((s,e)=>s+(e.сумма||0),0);
  // маржа — как в прежнем отчёте: только работы с MARG_FROM, до этого себестоимость не вели
  const mw=ws.filter(margCounted), mRev=mw.reduce((s,w)=>s+(w.цена||0),0), marg=mw.reduce((s,w)=>s+(w.маржа||0),0);
  const hours=ws.reduce((s,w)=>s+workHours(w),0);
  const краска=ws.reduce((s,w)=>s+(w.шаги||[]).reduce((a,st)=>{ const m=mById(st.материал_id); return a+(m&&m.тип==='краска'?st.факт_граммы:0); },0),0);
  // сравнение с прошлым месяцем на ту же дату: неполный текущий месяц иначе всегда «в минусе»
  const p=месяцДиапазон(_мес-1);
  const доДня=текущий ? Math.min(new Date().getDate(), p.дней) : p.дней;
  const pTo=isoLocal(new Date(p.d.getFullYear(), p.d.getMonth(), доДня));
  const pRev=DB.works.filter(w=>w.дата>=p.from && w.дата<=pTo).reduce((s,w)=>s+(w.цена||0),0);
  const дельта=pRev ? Math.round((rev-pRev)/pRev*100) : null;
  const дней=текущий ? new Date().getDate() : r.дней;
  const поДням=Array.from({length:дней},()=>0);
  ws.forEach(w=>{ const i=+w.дата.slice(8)-1; if(i<дней) поДням[i]+=w.цена||0; });
  const лучший=поДням.indexOf(Math.max(...поДням));
  const подписи=поДням.map((_,i)=>(i===0||(i+1)%5===0||i===дней-1)&&!(i===дней-2&&(i+1)%5===0)?String(i+1):'');
  const назв=MONTHS[r.d.getMonth()];

  let h=`<div class="hello"><div><div class="eyebrow">${назв}${r.d.getFullYear()!==new Date().getFullYear()?' '+r.d.getFullYear():''}${текущий?' · по сегодня':''}</div><div class="h1">Отчёт</div></div>${навМесяца()}</div>
    <div class="dark">
      <div class="cap"><span>Выручка</span>${дельта!=null?`<span class="pill"><i class="dot${дельта<0?' low':''}"></i>${дельта>=0?'+':''}${дельта}% к ${МЕС_ДАТ[p.d.getMonth()]}</span>`:''}</div>
      <div class="num hero" style="font-size:56px;margin-top:14px">${fmt(rev)}<small>₽</small></div>
      ${дней>=2&&rev?кривая(поДням,подписи,лучший):`<div class="sub">${rev?'':'В этом месяце работ нет'}</div>`}
      <div class="sub">${ws.length} ${plural(ws.length,'работа','работы','работ')}${rev?` · лучший день — ${лучший+1} ${МЕС_РОД[r.d.getMonth()]}`:''}</div>
    </div>
    <div class="two">
      <div class="glass"><div class="cap">Прибыль</div><div class="num" style="color:${rev-spend>=0?'var(--ink)':'var(--red)'}">${fmt(rev-spend)}<small>₽</small></div><div class="note">за месяц</div></div>
      <div class="glass"><div class="cap">Маржа</div><div class="num">${mRev?Math.round(marg/mRev*100):'—'}<small>${mRev?'%':''}</small></div><div class="note">${mRev?'средняя по работам':'себестоимость не считалась'}</div></div>
    </div>
    <div class="two">
      <div class="glass"><div class="cap">Средний чек</div><div class="num">${fmt(ws.length?rev/ws.length:0)}<small>₽</small></div><div class="note">за работу</div></div>
      <div class="glass"><div class="cap">В час</div><div class="num">${fmt(hours?rev/hours:0)}<small>₽</small></div><div class="note">${fmt1(hours)} ч в кресле</div></div>
    </div>
    <div class="two">
      <div class="glass"><div class="cap">Краска</div><div class="num">${fmt1(краска/1000)}<small>кг</small></div><div class="note">ушло за месяц</div></div>
      <div class="glass"><div class="cap">Расход</div><div class="num">${fmt(spend)}<small>₽</small></div><div class="note">все траты месяца</div></div>
    </div>`;

  // выручка по месяцам — нажатие открывает месяц
  const поМес={}; DB.works.forEach(w=>{ const k=w.дата.slice(0,7); поМес[k]=(поМес[k]||0)+(w.цена||0); });
  const ключи=Object.keys(поМес).sort().slice(-6);
  if(ключи.length>=2){
    const maxM=Math.max(...ключи.map(k=>поМес[k]),1), тек=r.from.slice(0,7);
    const лучшийМ=ключи.reduce((a,b)=>поМес[b]>поМес[a]?b:a, ключи[0]);
    h+=`<div class="glass"><div class="cap"><span>Выручка по месяцам</span><span style="letter-spacing:0;text-transform:none;font-weight:600">лучший — ${MONTHS_SHORT[+лучшийМ.slice(5)-1]}</span></div>
      <div class="months">${ключи.map(k=>`<button class="mon${k===тек?' on':''}" onclick="_мес=месяцСмещение('${k}-01');go('report',true)">
        <div class="v">${Math.round(поМес[k]/1000)}к</div>
        <div class="t"><i style="height:${Math.max(4,Math.round(поМес[k]/maxM*100))}%;background:${k===тек?'linear-gradient(180deg,#77533a,#2a211c)':'linear-gradient(180deg,#e2c79e,#b48c62)'}"></i></div>
        <div class="l">${MONTHS_SHORT[+k.slice(5)-1]}</div></button>`).join('')}</div></div>`;
  }
  // услуги: выручка за все работы месяца, маржа — только по тем, где считали себестоимость
  const поУсл={};
  ws.forEach(w=>{ const o=поУсл[w.услуга_назв]=поУсл[w.услуга_назв]||{n:0,rev:0,mRev:0,marg:0}; o.n++; o.rev+=w.цена||0;
    if(margCounted(w)){ o.mRev+=w.цена||0; o.marg+=w.маржа||0; } });
  const усл=Object.keys(поУсл).sort((a,b)=>поУсл[b].rev-поУсл[a].rev);
  if(усл.length){
    const top=поУсл[усл[0]].rev||1;
    h+=`<div class="glass"><div class="cap" style="margin-bottom:14px">Самые доходные услуги</div><div class="bars">${усл.map(k=>{ const o=поУсл[k];
      return `<div class="bar"><div class="l"><span class="nm"><span>${esc(k)}</span><em class="n">× ${o.n}</em></span><b>${fmt(o.rev)} ₽${o.mRev?`<em style="color:${margLevel(o.marg,o.mRev).c}">${Math.round(o.marg/o.mRev*100)}%</em>`:''}</b></div>
        <div class="tr"><i style="width:${Math.max(3,o.rev/top*100)}%"></i></div></div>`; }).join('')}</div></div>`;
  }
  // траты по категориям
  const поКат={}; ex.forEach(e=>поКат[e.категория]=(поКат[e.категория]||0)+(e.сумма||0));
  const кат=Object.keys(поКат).sort((a,b)=>поКат[b]-поКат[a]);
  if(кат.length){
    const top=поКат[кат[0]]||1;
    h+=`<div class="glass"><div class="cap" style="margin-bottom:14px">Куда ушли деньги</div><div class="bars">${кат.map(k=>
      `<div class="bar exp"><div class="l"><span>${EXP_CATS[k]||esc(k)}</span><b>${fmt(поКат[k])} ₽</b></div><div class="tr"><i style="width:${Math.max(3,поКат[k]/top*100)}%"></i></div></div>`).join('')}</div></div>`;
  }
  // внимание — по работам, где считали себестоимость («смесь в отход» убрана 08.11)
  const минус=mw.filter(w=>w.маржа<0).length;
  const низкая=mw.filter(w=>w.маржа>=0 && w.цена && w.маржа/w.цена*100<AMBER_MARGIN).length;
  if(минус||низкая){
    h+=`<div class="glass kvs"><div class="cap" style="margin-bottom:6px">Внимание</div>
      <div class="kv"><span>Работы в минус</span><b style="color:${минус?'var(--red)':'var(--green)'}">${минус||'нет'}</b></div>
      <div class="kv"><span>Низкая маржа (меньше ${AMBER_MARGIN}%)</span><b style="color:${низкая?'var(--amber)':'var(--green)'}">${низкая||'нет'}</b></div></div>`;
  }
  // за всё время
  const всеВыр=DB.works.reduce((s,w)=>s+(w.цена||0),0), всеТраты=(DB.expenses||[]).reduce((s,e)=>s+(e.сумма||0),0);
  const склад=DB.materials.reduce((s,m)=>s+m.остаток_г*gpr(m),0)+(DB.pieces||[]).reduce((s,p)=>s+p.остаток_шт*p.цена_за_штуку,0);
  h+=`<div class="glass kvs"><div class="cap" style="margin-bottom:6px">За всё время</div>
    <div class="kv"><span>Выручка</span><b>${fmt(всеВыр)} ₽</b></div>
    <div class="kv"><span>Все траты</span><b>${fmt(всеТраты)} ₽</b></div>
    <div class="kv"><span>Прибыль (касса)</span><b style="color:${всеВыр-всеТраты>=0?'var(--green)':'var(--red)'}">${fmt(всеВыр-всеТраты)} ₽</b></div>
    <div class="kv"><span>Заморожено в складе</span><b>${fmt(склад)} ₽</b></div>
    <div class="kv"><span>Вложено в оборудование</span><b>${fmt(equipTotal())} ₽</b></div></div>`;
  return h;
}

/* ==================== НАСТРОЙКИ ====================
   Содержимое — цех «Настройки» (renderSettings): группы строк, действия в шторках. */
function экранНастройки(){
  return `<div class="hello"><div><div class="h1">Настройки</div></div></div>
    <div class="settings">${renderSettings()}</div>`;
}

/* ==================== КРУГОВОЕ МЕНЮ ====================
   Открывается только кнопкой в углу шапки — на входе само не выскакивает. */
const СЕКТОРЫ=[
  {l:'Работа', ic:'works', run:()=>{ _день=todayISO(); go('works'); работаНаДень(); }},
  {l:'Расход', ic:'expenses', run:()=>{ _мес=0; go('expenses'); setTimeout(()=>{ const i=document.getElementById('qa_sum'); if(i) i.focus(); },350); }},
  {l:'Отчёт', ic:'report', run:()=>go('report')},
  {l:'Склад', ic:'stock', run:()=>go('stock')},
  {l:'Приход', ic:'incoming', run:()=>{ go('stock'); incomingSheet(); }},
  {l:'Заказ', ic:'order', run:()=>{ go('stock'); открытьЗаказ(); }},
];
function построитьКолесо(){
  const R0=74,R1=166,ST=10,G=5,n=СЕКТОРЫ.length,span=360/n;
  const pt=(r,a)=>[r*Math.sin(a*Math.PI/180), -r*Math.cos(a*Math.PI/180)];
  const r0=R0+ST/2, r1=R1-ST/2, di=(G+ST/2)/r0*180/Math.PI, dO=(G+ST/2)/r1*180/Math.PI;
  let paths='', labels='';
  СЕКТОРЫ.forEach((s,i)=>{
    const a0=i*span-span/2, a1=a0+span;
    const [x0,y0]=pt(r1,a0+dO),[x1,y1]=pt(r1,a1-dO),[x2,y2]=pt(r0,a1-di),[x3,y3]=pt(r0,a0+di);
    paths+=`<path data-i="${i}" d="M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z" fill="#fff4ea" stroke="#fff4ea" stroke-width="${ST}" stroke-linejoin="round" opacity=".22"/>`;
    const [lx,ly]=pt((R0+R1)/2, a0+span/2);
    labels+=`<div class="wl" style="left:${(170+lx)/3.4}%;top:${(170+ly)/3.4}%">${ИК[s.ic]}${s.l}</div>`;
  });
  const wh=document.getElementById('wheel');
  wh.innerHTML=`<svg viewBox="-170 -170 340 340">${paths}</svg>${labels}<button class="core" onclick="закрытьМеню()" aria-label="Закрыть меню"><i></i></button>`;
  wh.querySelectorAll('path').forEach(p=>p.addEventListener('click',()=>{
    p.classList.add('hot');
    setTimeout(()=>{ закрытьМеню(); p.classList.remove('hot'); СЕКТОРЫ[+p.dataset.i].run(); },160);
  }));
}
function открытьМеню(){ closeSheet(); document.getElementById('radial').classList.add('open'); }
function закрытьМеню(){ document.getElementById('radial').classList.remove('open'); }

/* ==================== ЗАПУСК ==================== */
// Приложение на экране «Домой» рисуется под строкой состояния (index.html: black-translucent).
// Если iOS это применила, сверху есть отступ под часы (.edge). Если нет (иконку добавили до
// этой настройки) — полоса своя, её прячет переход у верхнего края.
function отступСверху(){
  const p=document.createElement('div');
  p.style.cssText='position:absolute;top:0;height:env(safe-area-inset-top,0px);visibility:hidden';
  document.body.appendChild(p); const h=p.getBoundingClientRect().height; p.remove();
  return h;
}
// iOS в этом режиме рисует страницу с самого верха экрана, а высоту считает без строки
// состояния — снизу оставалась полоса голого фона. С экрана «Домой» приложение и так во весь
// экран, поэтому если страница ниже экрана — тянем её ровно на высоту экрана (.short).
function подогнатьКрая(){
  const html=document.documentElement, верх=отступСверху();
  const сЭкранаДомой = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const экран = innerWidth<innerHeight ? Math.max(screen.width,screen.height) : Math.min(screen.width,screen.height);
  const коротко = верх>0 && сЭкранаДомой && html.clientHeight < экран-1;
  html.classList.toggle('edge', верх>0);
  html.classList.toggle('short', коротко);
  html.style.setProperty('--app-h', коротко ? экран+'px' : '100%');
}
подогнатьКрая();
// Отступ под часы iOS сообщает не сразу: в момент запуска он бывал 0 (сборка 30 из-за этого
// не растянулась) — проверяем ещё раз после загрузки, при повороте и при возврате в приложение.
addEventListener('load', подогнатьКрая); addEventListener('resize', подогнатьКрая); addEventListener('pageshow', подогнатьКрая);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) подогнатьКрая(); });
[150, 600, 1500].forEach(t=>setTimeout(подогнатьКрая, t));
addEventListener('touchstart', подогнатьКрая, {once:true, passive:true});
// Размеры экрана — по нажатию на «Сборка …» в Настройках: если вёрстка на телефоне снова
// разойдётся с экраном, хватит одного скриншота.
function размерыЭкрана(){
  const ph=document.getElementById('phone').getBoundingClientRect();
  toast(`экран ${screen.width}×${screen.height} · окно ${innerWidth}×${innerHeight} · страница ${document.documentElement.clientHeight} · сверху ${Math.round(отступСверху())} · приложение ${Math.round(ph.top)}–${Math.round(ph.bottom)} · ${document.documentElement.className||'—'}`);
}
построитьКолесо();
load();
go('stock');
pullSync(); // при старте подтягиваем свежие данные с сервера (если подключён)
// Офлайн-режим при открытии по https (на file:// и в песочнице тихо пропускается)
if('serviceWorker' in navigator && location.protocol==='https:'){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
// Просим браузер не стирать хранилище при нехватке места
if(navigator.storage && navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
