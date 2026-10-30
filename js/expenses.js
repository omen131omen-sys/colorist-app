/* ==================== ЦЕХ «РАСХОД» ====================
   Журнал трат по категориям (закупки материалов приходят сюда со Склада) и оборудование.
   Подробно: docs/workshops/expenses.md */

/* ==================== РАСХОД ==================== */
// «материалы» приходят ТОЛЬКО со склада (Приход) — в ручной ввод не даём, чтобы не путаться.
const EXP_CATS={материалы:'Материалы', расходники:'Расходники', косметика:'Косметика/уход', мелочь:'Мелочь/сервис', еда:'Еда', такси:'Такси', аренда:'Аренда', кредит:'Кредит', налог:'Налог', реклама:'Реклама', обучение:'Обучение', прочее:'Прочее'};
const EXP_MANUAL_CATS=['расходники','косметика','мелочь','еда','такси','аренда','кредит','налог','реклама','обучение','прочее'];
const EXP_CAT_KEYS=Object.keys(EXP_CATS);
let _expPeriod='month';
function setExpPeriod(p){ _expPeriod=p; document.getElementById('view').innerHTML=renderExpenses(); }
function expInPeriod(p){ return (DB.expenses||[]).filter(e=>inPeriod(e.дата,p)); }
function equipTotal(){ return (DB.equipment||[]).reduce((s,e)=>s+(e.цена||0)*(e.кол_во||1),0); }
function renderExpenses(){
  const seg=`<div class="seg" style="margin-bottom:${_expPeriod==='month'?'8px':'12px'}">${W_PERIODS.map(([k,l])=>
    `<button class="${_expPeriod===k?'on':''}" onclick="setExpPeriod('${k}')">${l}</button>`).join('')}</div>`
    + (_expPeriod==='month'?monthNav('renderExpenses'):'');
  const list=expInPeriod(_expPeriod).sort((a,b)=>b.дата.localeCompare(a.дата));
  const total=list.reduce((s,e)=>s+(e.сумма||0),0);
  const byCat={}; list.forEach(e=>byCat[e.категория]=(byCat[e.категория]||0)+(e.сумма||0));
  let h=seg;
  h+=`<div class="stat" style="margin-bottom:6px"><div class="lab">Расход за период</div><div class="num mono">${money(total)}</div></div>`;
  const catChips=EXP_CAT_KEYS.filter(k=>byCat[k]).map(k=>`<span class="chip">${EXP_CATS[k]}: ${money(byCat[k])}</span>`).join('');
  if(catChips) h+=`<div style="margin:2px 0 10px">${catChips}</div>`;
  h+=`<div class="sm muted" style="margin:2px 2px 10px">💡 Краски, оксиды, порошок, смывка, маски — через «Приход» на Складе. Здесь — расходники (перчатки, фольга, шапочки), косметика (шампуни, укладочные, термозащита), еда, такси, аренда и прочее.</div>`;
  // Оборудование
  h+=`<div class="card tap" onclick="equipSheet()" style="display:flex;align-items:center;gap:11px">
    <span class="gico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a3.7 3.7 0 0 0-5 5l-6 6 2 2 6-6a3.7 3.7 0 0 0 5-5l-2.2 2.2-2-2Z"/></svg></span>
    <div class="grow"><div class="title">Оборудование</div><div class="sm muted">${(DB.equipment||[]).length} поз. · вложено ${money(equipTotal())}</div></div>
    <span style="color:var(--muted)">›</span></div>`;
  if(!list.length) return h+`<div class="empty"><div class="em">🧾</div><div class="sm">За период трат нет. Нажми «＋ Добавить расход».</div></div>`;
  // группировка по дням
  const byDay={}; list.forEach(e=>{ (byDay[e.дата]=byDay[e.дата]||[]).push(e); });
  Object.keys(byDay).sort((a,b)=>b.localeCompare(a)).forEach(day=>{
    const items=byDay[day]; const dTot=items.reduce((s,e)=>s+e.сумма,0);
    h+=`<div class="section-title"><span>${fmtDateFull(day)}</span><span class="muted mono">${money(dTot)}</span></div>`;
    items.forEach(e=>{
      const isAuto=e.категория==='материалы' && e.материал_id;
      h+=`<div class="card${isAuto?'':' tap'}"${isAuto?'':` onclick="editExpense('${e.id}')"`}>
        <div class="row between">
          <div class="grow"><div class="title ell">${esc(e.заметка||EXP_CATS[e.категория]||'Расход')}</div>
            <div class="sm muted">${EXP_CATS[e.категория]||e.категория}${isAuto?' · со склада':''}</div></div>
          <div class="row" style="gap:10px">
            <div class="title mono">${money(e.сумма)}</div>
            <span class="iconbtn" onclick="event.stopPropagation();delExpense('${e.id}')">🗑</span>
          </div>
        </div>
      </div>`;
    });
  });
  return h;
}
function editExpense(id){
  const e = id ? (DB.expenses.find(x=>x.id===id)||{}) : {категория:'мелочь', сумма:'', дата:todayISO(), заметка:''};
  openSheet(id?'Изменить расход':'Новый расход', `
    <div class="sm muted" style="margin-bottom:12px">«Расходники» — перчатки, фольга, шапочки, полотенца/пеньюары одноразовые. «Косметика/уход» — шампуни, кондиционеры, укладочные, термозащита. Краски, оксиды, порошок, смывка, маски — через «Приход» на Складе.</div>
    <label class="fld"><span>Категория</span>
      <select id="ex_cat">${EXP_MANUAL_CATS.map(k=>`<option value="${k}" ${e.категория===k?'selected':''}>${EXP_CATS[k]}</option>`).join('')}</select></label>
    <div class="fld-row">
      <label class="fld"><span>Сумма, ₽</span><input id="ex_sum" type="number" inputmode="numeric" value="${e.сумма||''}" placeholder="500"></label>
      <label class="fld"><span>Дата</span><input id="ex_date" type="date" value="${e.дата||todayISO()}"></label>
    </div>
    <label class="fld"><span>Заметка</span><input id="ex_note" value="${esc(e.заметка||'')}" placeholder="Чай, такси, вата…"></label>`,
    [ id?`<button class="btn danger wauto" onclick="delExpense('${id}')">🗑</button>`:`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
      `<button class="btn" onclick="saveExpense('${id||''}')">Сохранить</button>`]);
}
function saveExpense(id){
  const g=x=>document.getElementById(x).value;
  const сумма=+g('ex_sum')||0; if(сумма<=0) return toast('Введите сумму');
  const obj={ категория:g('ex_cat'), сумма, дата:g('ex_date')||todayISO(), заметка:g('ex_note').trim()||EXP_CATS[g('ex_cat')] };
  if(id){ const i=DB.expenses.findIndex(x=>x.id===id); if(i>=0) DB.expenses[i]={...DB.expenses[i], ...obj}; }
  else DB.expenses.push({id:uid('e'), ...obj});
  const былП=_expPeriod, былМ=_monthOff;
  _expPeriod=periodShowing(obj.дата, _expPeriod);
  save(); closeSheet(); go('expenses');
  const сменился = _expPeriod!==былП || _monthOff!==былМ;
  toast(сменился ? 'Сохранено · показан '+(_expPeriod==='month'?monthLabel():'весь период') : 'Сохранено');
}
/* Закупку со склада тоже можно удалить — ошиблись в приходе, надо откатить и деньги, и граммы. */
function delExpense(id){
  const e=(DB.expenses||[]).find(x=>x.id===id); if(!e) return;
  const m=e.материал_id?mById(e.материал_id):null;
  // У старых закупок поля «граммы» нет — достаём число упаковок из заметки («… · 2 уп.»)
  // и умножаем на вес упаковки. Так удаление откатывает склад и для давних записей.
  let г=+e.граммы||0, поЗаметке=false;
  if(!г && m){
    const уп=(e.заметка||'').replace(',','.').match(/(\d+(?:\.\d+)?)\s*уп/i);
    if(уп){ г=Math.round(+уп[1]*m.нетто_г*10)/10; поЗаметке=true; }
  }
  const вернём=(m && г>0) ? Math.min(г, m.остаток_г) : 0;
  const msg = вернём
    ? `Удалить закупку на ${money(e.сумма)}? Со склада уйдёт ${fmtG(вернём)} г${поЗаметке?' (по заметке)':''} — остаток «${m.название}» станет ${fmtG(m.остаток_г-вернём)} г.`
    : (m ? `Удалить закупку на ${money(e.сумма)}? Сколько граммов было в этом приходе — неизвестно, поэтому остаток не изменится. Поправьте его вручную: Приход → «поправить граммы без денег».`
         : 'Удалить эту запись расхода?');
  confirmDo(msg, ()=>{
    if(вернём) m.остаток_г = Math.round((m.остаток_г-вернём)*10)/10;
    // Цену возвращаем, только если её с тех пор не переписал другой приход.
    let ценаНазад=false;
    if(m && e.цена_до!=null && e.цена_после!=null && m.цена_упаковки===e.цена_после && e.цена_до!==e.цена_после){
      m.цена_упаковки=e.цена_до; ценаНазад=true;
    }
    DB.expenses=DB.expenses.filter(x=>x.id!==id);
    save(); closeSheet(); go('expenses');
    toast('Удалено'+(вернём?' · склад −'+fmtG(вернём)+' г':'')+(ценаНазад?' · цена '+money(e.цена_до):''));
  });
}

/* Оборудование / имущество */
function equipSheet(){
  const list=DB.equipment||[];
  const rows=list.map(e=>`<div class="card tap" onclick="editEquip('${e.id}')">
    <div class="row between"><div class="grow"><div class="title ell">${esc(e.название)}</div>
      <div class="sm muted">${e.кол_во||1} шт${e.дата?' · '+fmtDate(e.дата):''}</div></div>
      <div class="title mono">${money((e.цена||0)*(e.кол_во||1))}</div></div></div>`).join('');
  openSheet('Оборудование', `
    <div class="stat" style="margin-bottom:10px"><div class="lab">Всего вложено</div><div class="num mono">${money(equipTotal())}</div></div>
    ${rows||'<div class="sm muted" style="margin-bottom:8px">Пока пусто. Добавь фен, утюжок, пеньюары…</div>'}
    <button class="btn soft" onclick="editEquip('')">＋ Добавить оборудование</button>`,
    [`<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`]);
}
function editEquip(id){
  const e = id ? (DB.equipment.find(x=>x.id===id)||{}) : {название:'', кол_во:1, цена:'', дата:todayISO()};
  openSheet(id?'Изменить':'Новое оборудование', `
    <label class="fld"><span>Название</span><input id="eq_name" value="${esc(e.название||'')}" placeholder="Фен Dyson"></label>
    <div class="fld-row">
      <label class="fld"><span>Кол-во</span><input id="eq_qty" type="number" inputmode="numeric" value="${e.кол_во||1}"></label>
      <label class="fld"><span>Цена за шт, ₽</span><input id="eq_price" type="number" inputmode="numeric" value="${e.цена||''}" placeholder="30000"></label>
      <label class="fld"><span>Дата</span><input id="eq_date" type="date" value="${e.дата||todayISO()}"></label>
    </div>`,
    [ id?`<button class="btn danger wauto" onclick="delEquip('${id}')">🗑</button>`:`<button class="btn ghost" onclick="equipSheet()">Назад</button>`,
      `<button class="btn" onclick="saveEquip('${id||''}')">Сохранить</button>`]);
}
function saveEquip(id){
  const g=x=>document.getElementById(x).value;
  const name=g('eq_name').trim(); if(!name) return toast('Введите название');
  const obj={ название:name, кол_во:+g('eq_qty')||1, цена:+g('eq_price')||0, дата:g('eq_date')||'' };
  if(id){ const i=DB.equipment.findIndex(x=>x.id===id); if(i>=0) DB.equipment[i]={...DB.equipment[i], ...obj}; }
  else { if(!DB.equipment)DB.equipment=[]; DB.equipment.push({id:uid('q'), ...obj}); }
  save(); equipSheet(); toast('Сохранено');
}
function delEquip(id){ confirmDo('Удалить оборудование из списка?', ()=>{
  DB.equipment=DB.equipment.filter(x=>x.id!==id); save(); equipSheet(); toast('Удалено'); }); }
