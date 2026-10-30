/* ==================== ЦЕХ «СКЛАД» ====================
   Экран Склад: группы материалов, поиск, карточка, приход одной позиции,
   приход списком, список «Заказать», создание/правка материалов.
   Подробно: docs/workshops/stock.md */

/* ==================== СКЛАД ==================== */
const ICN_ALERT='<path d="M12 3.6 2.6 20h18.8Z"/><path d="M12 10v4.2"/><path d="M12 17.2h.01"/>';
const ICN_SAVE='<path d="M12 3v9.5M8.6 9.1 12 12.5l3.4-3.4"/><path d="M5 15.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5"/>';
function alertChip(b, icon, title, sub, action){
  const c = b==='r'?'var(--red)':b==='a'?'var(--amber)':'var(--green)';
  const bg = b==='r'?'var(--red-soft)':b==='a'?'var(--amber-soft)':'var(--green-soft)';
  return `<div class="alert-chip${action?' tap':''}" style="background:${bg}"${action?` onclick="${action}"`:''}>
    <span class="ac-ic" style="color:${c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>
    <div class="grow" style="min-width:0">
      <div class="ac-t" style="color:${c}">${title}</div>
      <div class="xs muted ell">${sub}</div>
    </div>
  </div>`;
}
function stockState(m){
  const r = m.остаток_г, min = m.мин_остаток_г;
  if(r <= min) return {cls:'low', badge:'r', txt:'Мало'};
  if(r <= min*1.5) return {cls:'warn', badge:'a', txt:'Заканчивается'};
  return {cls:'', badge:'g', txt:'В норме'};
}
let _stockQuery='';
function matCardHtml(m){
  const st = stockState(m);
  const pct = Math.max(4, Math.min(100, m.остаток_г/(m.нетто_г)*100));
  return `<div class="card tap gcard" onclick="matSheet('${m.id}')">
    <div class="title ell" style="font-size:13.5px;line-height:1.25">${esc(m.название)}</div>
    <div class="xs muted ell" style="margin-top:2px">${esc(m.бренд)}</div>
    <div class="bar ${st.cls}" style="margin-top:8px"><i style="width:${pct}%"></i></div>
    <div class="row between" style="margin-top:6px">
      <span class="mono"><b style="font-size:15px">${fmtG(m.остаток_г)}</b> <span class="xs muted">г</span></span>
      ${st.badge!=='g'?`<span class="badge ${st.badge}" style="padding:2px 7px">${st.txt}</span>`:`<span class="xs muted">${money1(gpr(m))}/г</span>`}
    </div>
  </div>`;
}
function pieceCardHtml(p){
  const low = p.остаток_шт<=10;
  return `<div class="card tap gcard" onclick="pieceSheet('${p.id}')">
    <div class="title ell" style="font-size:13.5px;line-height:1.25">${esc(p.название)}</div>
    <div class="xs muted" style="margin-top:2px">${money1(p.цена_за_штуку)}/шт</div>
    <div class="row between" style="margin-top:8px;align-items:flex-end">
      <span class="mono"><b style="font-size:20px;color:${low?'var(--red)':'var(--ink)'}">${p.остаток_шт}</b> <span class="xs muted">шт</span></span>
      ${low?`<span class="badge r" style="padding:2px 7px">Мало</span>`:''}
    </div>
  </div>`;
}
function onStockSearch(el){ _stockQuery=el.value; document.getElementById('sbClear').style.display=el.value?'':'none'; document.getElementById('stockBody').innerHTML=renderStockBody(); }
function clearStockSearch(){ _stockQuery=''; const i=document.getElementById('stockSearch'); if(i){i.value='';i.focus();} document.getElementById('sbClear').style.display='none'; document.getElementById('stockBody').innerHTML=renderStockBody(); }
function renderStock(){
  const searchBox=`<div class="searchbar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
    <input id="stockSearch" placeholder="Найти оттенок, бренд…" value="${esc(_stockQuery)}" oninput="onStockSearch(this)">
    <button class="sb-clear" id="sbClear" onclick="clearStockSearch()" style="${_stockQuery?'':'display:none'}">✕</button>
  </div>`;
  return searchBox + `<div id="stockBody">${renderStockBody()}</div>`;
}
/* Порядок на складе. Краски — как в палитре: уровень от светлого к тёмному (10→1),
   корректоры 0.xx в конце; внутри уровня тон по возрастанию (6.0, 6.1, 6.2, 6.21, 6.32, 6.4).
   Оксиды — по проценту от слабого к сильному. Остальное — по алфавиту. */
function sortMats(list){
  return list.slice().sort((a,b)=>{
    if(a.тип==='оксид' && b.тип==='оксид'){
      const pa=parseFloat(_matPct(a)), pb=parseFloat(_matPct(b));
      if(isFinite(pa) && isFinite(pb) && pa!==pb) return pa-pb;
      return a.название.localeCompare(b.название,'ru');
    }
    const ca=_matCode(a), cb=_matCode(b);
    if(ca && cb){
      const [la,ta='']=ca.split('.'), [lb,tb='']=cb.split('.');
      if(+la!==+lb) return +lb-+la;              // уровень: 10 → 1, ноль-корректоры сами уедут вниз
      if(ta!==tb) return ta<tb?-1:1;             // тон как строка: 2 < 21 < 32 < 4
      return a.название.localeCompare(b.название,'ru');
    }
    if(ca && !cb) return -1;                     // с кодом — выше
    if(!ca && cb) return 1;
    return a.название.localeCompare(b.название,'ru');
  });
}
function renderStockBody(){
  const q=_stockQuery.trim().toLowerCase();
  if(q){
    const mm=sortMats(DB.materials.filter(m=>(m.название+' '+m.бренд+' '+TYPE[m.тип]).toLowerCase().includes(q)));
    if(!mm.length) return `<div class="empty"><div class="em">🔍</div><div class="sm">Ничего не найдено по «${esc(_stockQuery)}»</div></div>`;
    return `<div class="sm muted" style="margin:2px 2px 8px">Найдено: ${mm.length}</div><div class="mgrid">${mm.map(matCardHtml).join('')}</div>`;
  }
  const low = DB.materials.filter(m=>m.остаток_г<=m.мин_остаток_г).length;
  let h = '';
  // Компактные уведомления в один ряд.
  const alerts=[];
  if(low>0) alerts.push(alertChip('r', ICN_ALERT, `${low} на исходе`, 'открыть список', "orderSheet()"));
  // Резервное копирование живёт в Настройках — на Складе не мозолит.
  if(alerts.length) h += `<div class="alerts">${alerts.join('')}</div>`;
  const groups = [
    {k:'краска', ic:'🎨', title:'Краска'},
    {k:'оксид', ic:'🧪', title:'Оксид / активатор'},
    {k:'пудра', ic:'✨', title:'Порошок'},
    {k:'смывка', ic:'🧴', title:'Смывка'},
    {k:'уход', ic:'💆', title:'Уход'},
  ];
  groups.forEach(g=>{
    const items = sortMats(DB.materials.filter(m=>m.тип===g.k));
    if(!items.length) return;
    const lowN = items.filter(m=>m.остаток_г<=m.мин_остаток_г).length;
    const open = !!_stockOpen[g.k];
    h += accHeader(g.k, g.ic, g.title, items.length, lowN, open);
    if(open) h += `<div class="mgrid">` + items.map(matCardHtml).join('') + `</div>`;
  });
  if(!DB.materials.length) h += emptyBox('📦','Склад пуст','Кнопка «＋» внизу справа. Или загрузите копию: ⚙️ Настройки → «Восстановить из копии»');
  return h;
}

function accHeader(k, ic, title, n, lowN, open){
  return `<div class="card tap acc" onclick="toggleStock('${k}')">
    <div class="row between">
      <div class="row" style="gap:11px">${gico(k)}<span class="title">${title}</span></div>
      <div class="row" style="gap:9px">
        ${lowN?`<span class="badge r">${lowN} мало</span>`:''}
        <span class="muted mono">${n}</span>
        <span style="display:inline-block;color:var(--muted);transition:transform .2s;${open?'transform:rotate(90deg)':''}">▸</span>
      </div>
    </div>
  </div>`;
}
let _stockOpen = {краска:true};
function toggleStock(k){
  _stockOpen[k]=!_stockOpen[k];
  const b=document.getElementById('stockBody'); if(b) b.innerHTML=renderStockBody();
}
/* Список «Заказать» — позиции на исходе, копируется одной кнопкой. */
/* Бренд к названию — но только если его там ещё нет (у оксидов он уже вшит). */
function withBrand(название, бренд){
  const br=(бренд||'').trim();
  if(!br || br==='—') return название;
  const key=br.toLowerCase().split(/\s+/)[0];
  return название.toLowerCase().includes(key) ? название : название+' · '+br;
}
function orderList(){
  return sortMats(DB.materials.filter(m=>m.остаток_г<=m.мин_остаток_г))
    .map(m=>({название:m.название, бренд:m.бренд, текст:`${fmtG(m.остаток_г)} г`}));
}
function orderSheet(){
  const list=orderList();
  if(!list.length) return toast('Всё в норме — заказывать нечего ✅');
  const rows=list.map(x=>`<div class="kv"><span class="k">${esc(withBrand(x.название,x.бренд))}</span><span class="v mono" style="color:var(--red);white-space:nowrap">${esc(x.текст)}</span></div>`).join('');
  openSheet('Заказать', `
    <div class="sm muted" style="margin-bottom:10px">${list.length} ${plural(list.length,'позиция','позиции','позиций')} на исходе. Скопируй список и отправь поставщику.</div>
    <div class="card">${rows}</div>`,
    [`<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`,
     `<button class="btn" onclick="copyOrder()">📋 Скопировать список</button>`]);
}
function copyOrder(){
  const list=orderList();
  const t='Заказать:\n'+list.map(x=>'• '+withBrand(x.название,x.бренд)+' — '+x.текст).join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(()=>toast('Список скопирован'),()=>fallbackCopy(t));
  else fallbackCopy(t);
}
function matSheet(id){
  const m = mById(id);
  const st = stockState(m);
  openSheet(esc(m.название), `
    <div class="card">
      <div class="kv"><span class="k">Бренд</span><span class="v">${esc(m.бренд)}</span></div>
      <div class="kv"><span class="k">Тип</span><span class="v">${TYPE[m.тип]||m.тип}</span></div>
      ${m.объём_мл?`<div class="kv"><span class="k">Объём упаковки</span><span class="v">${m.объём_мл} мл</span></div>`:''}
      <div class="kv"><span class="k">Вес полной упаковки</span><span class="v">${fmtG(m.нетто_г)} г</span></div>
      ${m.тара_г?`<div class="kv"><span class="k">Вес пустой тары</span><span class="v">${m.тара_г} г</span></div>`:''}
      <div class="kv"><span class="k">Цена упаковки</span><span class="v">${money(m.цена_упаковки)}</span></div>
      <div class="kv"><span class="k">Цена за грамм</span><span class="v">${money1(gpr(m))}</span></div>
      <div class="kv"><span class="k">Текущий остаток</span><span class="v">${fmtG(m.остаток_г)} г${m.объём_мл?` · ≈${Math.round(m.остаток_г/m.нетто_г*10)/10} уп.`:''}</span></div>
      <div class="kv"><span class="k">Мин. остаток</span><span class="v">${m.мин_остаток_г} г</span></div>
      <div class="kv"><span class="k">Статус</span><span class="v" style="color:${st.badge==='r'?'var(--red)':st.badge==='a'?'var(--amber)':'var(--green)'}">${st.txt}</span></div>
      <div class="kv"><span class="k">Стоимость остатка</span><span class="v">${money(m.остаток_г*gpr(m))}</span></div>
    </div>`,
    [
      `<button class="btn soft" onclick="restockMat('${id}')">📥 Приход</button>`,
      `<button class="btn ghost" onclick="editMaterial('${id}')">✏️ Изменить</button>`,
    ]);
}
function pieceSheet(id){
  const p = pById(id);
  openSheet(esc(p.название), `
    <div class="card">
      <div class="kv"><span class="k">В упаковке</span><span class="v">${p.кол_во} шт</span></div>
      <div class="kv"><span class="k">Цена за штуку</span><span class="v">${money1(p.цена_за_штуку)}</span></div>
      <div class="kv"><span class="k">Остаток</span><span class="v">${p.остаток_шт} шт</span></div>
      <div class="kv"><span class="k">Стоимость остатка</span><span class="v">${money(p.остаток_шт*p.цена_за_штуку)}</span></div>
    </div>`,
    [
      `<button class="btn soft" onclick="restockPiece('${id}')">📥 Приход</button>`,
      `<button class="btn ghost" onclick="editPiece('${id}')">✏️ Изменить</button>`,
    ]);
}
function restockMat(id){
  const m = mById(id);
  openSheet('Приход · '+esc(m.название), `
    <div class="sm muted" style="margin-bottom:12px">Купили такую же упаковку — укажите сколько и за сколько. Граммы и деньги учтутся сами, взвешивать не нужно. 1 упаковка = ${fmtG(m.нетто_г)} г.</div>
    <div class="fld-row">
      <label class="fld"><span>Сколько упаковок</span>
        <input id="rq" type="number" inputmode="numeric" value="1" step="0.5"
          oninput="const s=document.getElementById('rs'); if(s) s.value=Math.round((+this.value||0)*${m.цена_упаковки})"></label>
      <label class="fld"><span>Сумма покупки, ₽</span>
        <input id="rs" type="number" inputmode="numeric" value="${m.цена_упаковки}"></label>
    </div>
    <div class="sm muted" style="margin:-4px 0 10px">Если цена изменилась — просто исправьте сумму, новая цена запомнится.</div>
    <div class="fld-row" style="align-items:flex-end">
      <label class="fld" style="flex:1"><span>Дата покупки</span>
        <input id="rd" type="date" value="${todayISO()}"></label>
      <label class="chk" style="flex:1;margin-bottom:12px">
        <input id="rx" type="checkbox" checked>
        <span>В расход<br><span class="xs muted">записать трату</span></span>
      </label>
    </div>
    <div class="sm muted" style="margin:-4px 0 10px">Купила в августе — поставь ту дату, трата ляжет в август. Сними галочку, если эта покупка уже посчитана.</div>
    <div class="divider"></div>
    <label class="fld"><span>…или поправить граммы без денег (початая тара, ошиблись в приходе)</span>
      <input id="rg" type="number" inputmode="text" placeholder="напр. 50 или −61"></label>
    <div class="sm muted" style="margin:-6px 0 8px">Плюс добавит, минус уберёт. Расход при этом не меняется.</div>
    <div class="sm muted">Текущий остаток: ${fmtG(m.остаток_г)} г</div>`,
    [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
     `<button class="btn" onclick="doRestockMat('${id}')">Добавить</button>`]);
}
function doRestockMat(id){
  const m=mById(id);
  const g=+document.getElementById('rg').value||0;
  const packs=+document.getElementById('rq').value||0;
  if(g!==0){ // корректировка граммами, без денег. Минус — чтобы убрать лишнее (ошиблись в приходе)
    const было=m.остаток_г;
    m.остаток_г = Math.max(0, Math.round((m.остаток_г+g)*10)/10);
    save(); closeSheet(); go('stock');
    return toast('Остаток '+fmtG(было)+' → '+fmtG(m.остаток_г)+' г (без денег)');
  }
  if(packs<=0) return toast('Укажите количество упаковок');
  const сумма=+document.getElementById('rs').value||0;
  const дата=document.getElementById('rd').value||todayISO();
  const вРасход=document.getElementById('rx').checked;
  const add = packs*m.нетто_г;
  m.остаток_г += add;
  // цена изменилась → запоминаем новую цену упаковки (себестоимость дальше по ней)
  const newPack = сумма/packs;
  const ценаДо = m.цена_упаковки;
  if(сумма>0 && Math.abs(newPack-m.цена_упаковки)>=1) m.цена_упаковки = Math.round(newPack);
  // цену до/после помним — удаление закупки должно вернуть и её, а не только граммы
  if(вРасход) logPurchase({материал_id:m.id, название:m.название, кол:packs+' уп.', граммы:add, сумма, дата,
                           цена_до:ценаДо, цена_после:m.цена_упаковки});
  save(); closeSheet(); go('stock');
  toast('Приход +'+fmtG(add)+' г'+(вРасход?' · в расход '+money(сумма)+' ('+fmtDay(дата)+')':' · без расхода'));
}
function restockPiece(id){
  const p=pById(id);
  openSheet('Приход · '+esc(p.название), `
    <div class="fld-row">
      <label class="fld"><span>Сколько добавить, шт</span>
        <input id="rq" type="number" inputmode="numeric" value="${p.кол_во}"
          oninput="const s=document.getElementById('rs'); if(s) s.value=Math.round((+this.value||0)*${p.цена_за_штуку})"></label>
      <label class="fld"><span>Сумма покупки, ₽</span>
        <input id="rs" type="number" inputmode="numeric" value="${Math.round(p.кол_во*p.цена_за_штуку)}"></label>
    </div>
    <div class="sm muted">Текущий остаток: ${p.остаток_шт} шт. Если цена изменилась — исправьте сумму.</div>`,
    [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
     `<button class="btn" onclick="doRestockPiece('${id}')">Добавить</button>`]);
}
function doRestockPiece(id){
  const p=pById(id); const q=+document.getElementById('rq').value||0;
  if(q<=0) return toast('Укажите количество');
  const сумма=+document.getElementById('rs').value||0;
  p.остаток_шт += q;
  const newPer = сумма/q;
  if(сумма>0 && Math.abs(newPer-p.цена_за_штуку)>=0.5) p.цена_за_штуку = Math.round(newPer*10)/10;
  logPurchase({материал_id:p.id, название:p.название, кол:q+' шт', граммы:0, сумма});
  save(); closeSheet(); go('stock'); toast('Приход +'+q+' шт · закупка '+money(сумма));
}
function logPurchase(o){
  if(!DB.expenses) DB.expenses=[];
  // Дата закупки может быть задней (купила в августе, вносит в сентябре) — перелистываем
  // календарь Расхода на её месяц, иначе трата окажется вне выбранного месяца.
  const дата=o.дата||todayISO();
  _expPeriod=periodShowing(дата, _expPeriod);
  // граммы храним, чтобы удаление закупки могло вернуть склад в прежнее состояние
  DB.expenses.push({id:uid('e'), дата, категория:'материалы', граммы:o.граммы||0,
    цена_до:o.цена_до, цена_после:o.цена_после,
    сумма:o.сумма||0, заметка:(o.название||'Закупка')+(o.кол?' · '+o.кол:''), материал_id:o.материал_id||null});
}

/* ==================== ПРИХОД СПИСКОМ ==================== */
/* Варианты для выпадашки материала. Кандидаты подбора — наверх, остальные — как на складе.
   Бренд в подписи: иначе «Оксид 6%» от разных марок не различить. */
function matOptions(id, candIds){
  let h='';
  if(candIds&&candIds.length){
    h+=candIds.map(cid=>{const c=mById(cid); return c?`<option value="${c.id}">${esc(c.название)} (${esc(c.бренд)})</option>`:'';}).join('');
    h+=`<option value="" disabled>──────────</option>`;
  }
  h+=sortMats(DB.materials).map(m=>
    `<option value="${m.id}" ${m.id===id?'selected':''}>${esc(withBrand(m.название,m.бренд))}</option>`).join('');
  return h;
}
/* Черновик живёт между открытиями: можно закрыть, завести недостающий материал и вернуться. */
let _inc=null;
function incomingSheet(){
  if(!DB.materials.length) return toast('Сначала заведите материалы на складе');
  if(!_inc) _inc={text:'', rows:[], дата:todayISO(), вРасход:true};
  if(!_inc.дата) _inc.дата=todayISO();
  drawIncoming();
}
function incParse(){
  const el=document.getElementById('inc_text');
  if(el) _inc.text=el.value;
  const t=(_inc.text||'').trim();
  if(!t) return toast('Вставьте список');
  const rows=parseIncomingText(t, DB.materials);
  if(!rows.length) return toast('Не удалось разобрать список');
  _inc.rows=rows; drawIncoming();
  const bad=rows.filter(r=>!r.материал_id).length;
  toast(bad ? `Разобрано, уточните ${bad} ${plural(bad,'позицию','позиции','позиций')}`
            : 'Список разобран ✓');
}
function incClear(){ _inc={text:'', rows:[], дата:todayISO(), вРасход:true}; drawIncoming(); }
function incDel(i){ _inc.rows.splice(i,1); drawIncoming(); }
/* Правка строки. Смена материала или количества пересчитывает граммы и сумму —
   но только те, которых не трогали руками: введённое вручную важнее подстановки. */
function incSet(i, поле, v){
  const r=_inc.rows[i]; if(!r) return;
  if(поле==='г'){ r.граммы=+v||0; r._gТронут=true; return incTotals(); }
  if(поле==='с'){ r.сумма=+v||0; r._sТронут=true; return incTotals(); }
  if(поле==='m'){ r.материал_id=v||null; r.кандидаты=null; }
  if(поле==='уп'){ r.уп=+v||0; }
  if(!r._gТронут) r.граммы=null;
  if(!r._sТронут) r.сумма=null;
  incFill(r); drawIncoming();
}
function incRowHtml(r, i){
  const m=r.материал_id?mById(r.материал_id):null;
  const amb=!m && r.кандидаты && r.кандидаты.length;
  const style = amb ? 'border-color:#f2ddb0;background:var(--amber-soft)'
              : !m ? 'border-color:#f3bcbc;background:var(--red-soft)' : '';
  const label = amb ? '<span style="color:var(--amber)">найдено несколько — выберите</span>'
              : !m ? '<span style="color:var(--red)">не распознано — выберите</span>'
              : TYPE[m.тип];
  const ценаНов = (r.сумма>0 && r.уп>0) ? Math.round(r.сумма/r.уп) : 0;
  const ценаИзм = m && ценаНов && Math.abs(ценаНов-m.цена_упаковки)>=1;
  // Цена за грамм скакнула в разы — почти всегда это другая фасовка (взяла литр вместо 5 л),
  // а не новая цена. Молча переписать цену упаковки = испортить себестоимость всех работ.
  const скачок = ценаИзм && m.цена_упаковки>0 &&
    (ценаНов/m.цена_упаковки>1.5 || ценаНов/m.цена_упаковки<0.67);
  const v=x=>x==null?'':x;
  return `<div class="step-card" style="${style}">
    <div class="row between" style="margin-bottom:7px">
      <span class="xs muted ell grow">«${esc(r.raw)}»</span>
      <span class="iconbtn" style="flex:none;width:28px;height:28px" onclick="incDel(${i})">✕</span>
    </div>
    <label class="fld" style="margin-bottom:8px"><span>${label}</span>
      <select onchange="incSet(${i},'m',this.value)">
        <option value="">— выбрать —</option>${matOptions(r.материал_id, amb?r.кандидаты:null)}
      </select></label>
    <div class="fld-row" style="gap:8px">
      <label class="fld" style="margin-bottom:0"><span>Упак.</span>
        <input type="number" inputmode="decimal" step="0.5" value="${v(r.уп)}" onchange="incSet(${i},'уп',this.value)"></label>
      <label class="fld" style="margin-bottom:0"><span>Грамм</span>
        <input type="number" inputmode="numeric" value="${v(r.граммы)}" onchange="incSet(${i},'г',this.value)"></label>
      <label class="fld" style="margin-bottom:0"><span>Сумма, ₽</span>
        <input type="number" inputmode="numeric" value="${v(r.сумма)}" onchange="incSet(${i},'с',this.value)"></label>
    </div>
    ${m?`<div class="xs muted" style="margin-top:7px">Остаток ${fmtG(m.остаток_г)} → <b>${fmtG(m.остаток_г+(r.граммы||0))}</b> г · 1 уп. = ${fmtG(m.нетто_г)} г · цена уп. ${
      ценаИзм?`${money(m.цена_упаковки)} → <b style="color:var(--amber)">${money(ценаНов)}</b>`:money(m.цена_упаковки)}</div>`:''}
    ${скачок?`<div class="xs" style="margin-top:6px;color:var(--red)">⚠ цена упаковки меняется в ${
      (ценаНов>m.цена_упаковки?ценаНов/m.цена_упаковки:m.цена_упаковки/ценаНов).toFixed(1)} раза. Похоже, фасовка другая: в карточке 1 уп. = ${fmtG(m.нетто_г)} г. Поправь «Упак.» и «Грамм» — иначе себестоимость поедет.</div>`:''}
  </div>`;
}
function incSumHtml(){
  const rows=_inc.rows, готовы=rows.filter(incReady);
  const г=готовы.reduce((s,r)=>s+(r.граммы||0),0);
  const с=готовы.reduce((s,r)=>s+(r.сумма||0),0);
  const нет=rows.length-готовы.length;
  return `<div class="kv"><span class="k">Позиций к проведению</span><span class="v">${готовы.length}${
      нет?` <span class="xs" style="color:var(--red)">· ${нет} не готово</span>`:''}</span></div>
    <div class="kv"><span class="k">Придёт на склад</span><span class="v">+${fmtG(г)} г</span></div>
    <div class="kv"><span class="k">Итого сумма</span><span class="v">${money(с)}</span></div>`;
}
function incReady(r){ return !!r.материал_id && ((r.граммы||0)>0 || (r.сумма||0)>0); }
function incTotals(){ const el=document.getElementById('inc_sum'); if(el) el.innerHTML=incSumHtml(); }
function drawIncoming(){
  const rows=_inc.rows;
  const готово=rows.filter(incReady).length;
  openSheet('Приход списком', `
    <div class="sm muted" style="margin-bottom:10px">Вставь список покупок — по строке на позицию. Что понятно, подставится само; останется сверить граммы и цены.</div>
    <div class="card" style="background:var(--brand-soft);border-color:var(--brand-line)">
      <div class="xs" style="color:var(--brand);font-weight:700;margin-bottom:6px">СПИСОК ПОКУПОК</div>
      <textarea id="inc_text" rows="4" style="resize:vertical" onchange="_inc.text=this.value"
        placeholder="Lumia 6.2 — 2 шт — 1240&#10;Оксид 6% 1 уп 450&#10;пудра х2 1800">${esc(_inc.text||'')}</textarea>
      <div class="row" style="gap:8px;margin-top:8px">
        <button class="btn sm" style="flex:1;width:auto" onclick="incParse()">🔎 Разобрать</button>
        ${rows.length?`<button class="btn sm ghost" style="flex:none" onclick="incClear()">Очистить</button>`:''}
      </div>
    </div>
    ${rows.length?`
      <div class="section-title"><span>Сверка</span><span class="muted mono">${готово} из ${rows.length}</span></div>
      ${rows.map(incRowHtml).join('')}
      <div class="fld-row" style="align-items:flex-end;margin-top:4px">
        <label class="fld" style="flex:1"><span>Дата покупки</span>
          <input type="date" value="${_inc.дата}" onchange="_inc.дата=this.value"></label>
        <label class="chk" style="flex:1;margin-bottom:12px">
          <input type="checkbox" ${_inc.вРасход?'checked':''} onchange="_inc.вРасход=this.checked">
          <span>В расход<br><span class="xs muted">записать траты</span></span>
        </label>
      </div>
      <div class="sm muted" style="margin:-4px 0 10px">Дата одна на всю накладную: купила в августе — поставь ту, траты лягут в август.</div>
      <div class="card" id="inc_sum">${incSumHtml()}</div>`
    :`<div class="sm muted" style="margin:2px 2px 10px">Позиции, которой нет на складе, парсер не найдёт — заведи её через ＋ и нажми «Разобрать» ещё раз. Список никуда не денется.</div>`}
  `, rows.length
    ? [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
       `<button class="btn" onclick="doIncoming()">📥 Провести приход</button>`]
    : [`<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`]);
}
function doIncoming(){
  const rows=_inc.rows.filter(incReady);
  if(!rows.length) return toast('Нечего проводить — уточните позиции');
  const дата=_inc.дата||todayISO(), вРасход=!!_inc.вРасход;
  let итогГ=0, итогС=0, ценИзм=0;
  rows.forEach(r=>{
    const m=mById(r.материал_id); if(!m) return;
    const add=r.граммы||0, packs=r.уп||0, сумма=r.сумма||0;
    m.остаток_г=Math.round((m.остаток_г+add)*10)/10;
    // цена изменилась → запоминаем новую; цену до/после храним для отката закупки
    const ценаДо=m.цена_упаковки;
    if(сумма>0 && packs>0){
      const нов=Math.round(сумма/packs);
      if(Math.abs(нов-m.цена_упаковки)>=1){ m.цена_упаковки=нов; ценИзм++; }
    }
    if(вРасход && сумма>0) logPurchase({материал_id:m.id, название:m.название,
      кол:packs>0?packs+' уп.':fmtG(add)+' г', граммы:add, сумма, дата,
      цена_до:ценаДо, цена_после:m.цена_упаковки});
    _stockOpen[m.тип]=true;
    итогГ+=add; итогС+=сумма;
  });
  // недоделанные строки не теряем — остаются черновиком до следующего раза
  const остались=_inc.rows.filter(r=>!incReady(r));
  _inc = остались.length ? {text:_inc.text, rows:остались, дата, вРасход} : null;
  _stockQuery='';
  save(); closeSheet(); go('stock');
  const хвост=[];
  if(ценИзм) хвост.push(ценИзм+' ц. обновлено');
  if(остались.length) хвост.push(остались.length+' в черновике');
  toast(`Приход: ${rows.length} ${plural(rows.length,'позиция','позиции','позиций')} · +${fmtG(итогГ)} г`
    + (вРасход&&итогС?' · расход '+money(итогС):'')
    + (хвост.length?' · '+хвост.join(' · '):''));
}

function editMaterial(id){
  const m = id?mById(id):null;
  openSheet(m?'Изменить материал':'Новый материал', `<div id="matForm"></div>`, []);
  matKind('w', m);
}
function matKind(k, m){
  document.querySelectorAll('#matKind button').forEach(b=>b.classList.toggle('on', b.dataset.k===k));
  const f = document.getElementById('matForm');
  const foot = document.getElementById('sheetFoot');
  foot.style.display='flex';   // openSheet скрыл подвал (кнопки пришли пустыми) — возвращаем
  if(k==='w'){
    f.innerHTML = `
      <label class="fld"><span>Название</span><input id="f_name" value="${m?esc(m.название):''}" placeholder="Краска 6.0"></label>
      <label class="fld"><span>Бренд</span><input id="f_brand" value="${m?esc(m.бренд):''}" placeholder="Helen Seward"></label>
      <label class="fld"><span>Тип</span><select id="f_type">
        ${Object.keys(TYPE).map(t=>`<option value="${t}" ${m&&m.тип===t?'selected':''}>${TYPE[t]}</option>`).join('')}
      </select></label>
      <div class="fld-row">
        <label class="fld"><span>Объём упаковки, мл</span><input id="f_ml" type="number" inputmode="numeric" value="${m&&m.объём_мл?m.объём_мл:''}" placeholder="100" oninput="autoNet(this)"></label>
        <label class="fld"><span>Цена упаковки, ₽</span><input id="f_price" type="number" inputmode="numeric" value="${m?m.цена_упаковки:''}" placeholder="620"></label>
      </div>
      <div class="fld-row">
        <label class="fld"><span>Грамм в упаковке</span><input id="f_net" type="number" inputmode="numeric" value="${m?m.нетто_г:''}" placeholder="100"></label>
        <label class="fld"><span>Вес пустой тары, г <span class="xs muted">(не обяз.)</span></span><input id="f_tare" type="number" inputmode="numeric" value="${m&&m.тара_г?m.тара_г:''}" placeholder="—"></label>
      </div>
      <div class="sm muted" style="margin:-4px 0 12px">Цена за грамм = цена ÷ грамм в упаковке. Граммы прикидываются из мл (краска ≈ 0,93 г/мл — по замеру: тюбик 108 г − тара 15 г = 93 г на 100 мл). Взвесила точнее — впиши своё. Тара — только для сверки остатка на весах.</div>
      <div class="fld-row">
        <label class="fld"><span>Остаток, г</span><input id="f_rest" type="number" inputmode="numeric" value="${m?m.остаток_г:''}" placeholder="84"></label>
        <label class="fld"><span>Мин. остаток, г</span><input id="f_min" type="number" inputmode="numeric" value="${m?m.мин_остаток_г:30}" placeholder="30"></label>
      </div>`;
    foot.innerHTML = (m?`<button class="btn danger wauto" onclick="delMaterial('${m.id}')">🗑</button>`:'')+
      `<button class="btn" onclick="saveMaterialW('${m?m.id:''}')">Сохранить</button>`;
  } else {
    f.innerHTML = `
      <label class="fld"><span>Название</span><input id="f_name" value="${m&&m.остаток_шт!=null?esc(m.название):''}" placeholder="Перчатки"></label>
      <div class="fld-row">
        <label class="fld"><span>В упаковке, шт</span><input id="f_qty" type="number" inputmode="numeric" placeholder="100"></label>
        <label class="fld"><span>Цена за штуку, ₽</span><input id="f_pp" type="number" inputmode="numeric" placeholder="5"></label>
      </div>
      <label class="fld"><span>Остаток, шт</span><input id="f_rest" type="number" inputmode="numeric" placeholder="80"></label>`;
    foot.innerHTML = `<button class="btn" onclick="saveMaterialP('')">Сохранить</button>`;
  }
}
/* На этикетке пишут мл, работаем в граммах. Плотность НЕ равна 1:
   замер по тюбику краски — 108 г брутто − 15 г тара = 93 г на заявленные 100 мл (0.93).
   Подставляем прикидку по типу; если взвесила — вписывает своё, оно в приоритете. */
const DENSITY={краска:0.93, оксид:1.05, смывка:1, уход:1, пудра:1};
function autoNet(el){
  const net=document.getElementById('f_net'); if(!net) return;
  if(net.value && net.dataset.auto!=='1') return;   // введённое вручную не трогаем
  const t=(document.getElementById('f_type')||{}).value||'краска';
  const ml=+el.value||0;
  net.value = ml ? Math.round(ml*(DENSITY[t]||1)) : '';
  net.dataset.auto='1';
}
function saveMaterialW(id){
  const g=x=>document.getElementById(x).value;
  const name=g('f_name').trim(); if(!name) return toast('Введите название');
  const obj={ бренд:g('f_brand').trim()||'—', название:name, тип:g('f_type'),
    объём_мл:+g('f_ml')||0, тара_г:+g('f_tare')||0,
    нетто_г:+g('f_net')||1, цена_упаковки:+g('f_price')||0,
    остаток_г:+g('f_rest')||0, мин_остаток_г:+g('f_min')||0 };
  if(id){ Object.assign(mById(id), obj); } else { DB.materials.push({id:uid('m'),...obj}); }
  // Раскрываем группу и сбрасываем поиск — иначе позиция сохранится в свёрнутый раздел
  // и будет выглядеть как непополнившаяся.
  _stockOpen[obj.тип]=true; _stockQuery='';
  save(); closeSheet(); go('stock'); toast('Сохранено');
}
function saveMaterialP(id){
  const g=x=>document.getElementById(x).value;
  const name=g('f_name').trim(); if(!name) return toast('Введите название');
  const obj={ название:name, кол_во:+g('f_qty')||1, цена_за_штуку:+g('f_pp')||0, остаток_шт:+g('f_rest')||0 };
  DB.pieces.push({id:uid('p'),...obj});
  save(); closeSheet(); go('stock'); toast('Сохранено');
}
function editPiece(id){
  const p=pById(id);
  openSheet('Изменить расходник', `
    <label class="fld"><span>Название</span><input id="f_name" value="${esc(p.название)}"></label>
    <div class="fld-row">
      <label class="fld"><span>В упаковке, шт</span><input id="f_qty" type="number" inputmode="numeric" value="${p.кол_во}"></label>
      <label class="fld"><span>Цена за штуку, ₽</span><input id="f_pp" type="number" inputmode="numeric" value="${p.цена_за_штуку}"></label>
    </div>
    <label class="fld"><span>Остаток, шт</span><input id="f_rest" type="number" inputmode="numeric" value="${p.остаток_шт}"></label>`,
    [`<button class="btn danger wauto" onclick="delPiece('${id}')">🗑</button>`,
     `<button class="btn" onclick="savePiece('${id}')">Сохранить</button>`]);
}
function savePiece(id){
  const g=x=>document.getElementById(x).value;
  const p=pById(id);
  p.название=g('f_name').trim()||p.название; p.кол_во=+g('f_qty')||1;
  p.цена_за_штуку=+g('f_pp')||0; p.остаток_шт=+g('f_rest')||0;
  save(); closeSheet(); go('stock'); toast('Сохранено');
}
function delMaterial(id){ confirmDo('Удалить расходник?', ()=>{
  DB.materials=DB.materials.filter(m=>m.id!==id); save(); closeSheet(); go('stock'); toast('Удалено'); }); }
function delPiece(id){ confirmDo('Удалить расходник?', ()=>{
  DB.pieces=DB.pieces.filter(p=>p.id!==id); save(); closeSheet(); go('stock'); toast('Удалено'); }); }
