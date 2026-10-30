/* ==================== ЦЕХ «РАБОТЫ» ====================
   Журнал работ по дням и мастер «Расчёт работы»: формула → строки расхода,
   типовой расход, цена, маржа; списание и возврат склада. Подробно: docs/workshops/works.md */

/* ==================== РАБОТЫ (журнал по дням) ==================== */
let _wPeriod='month';

function setWPeriod(p){ _wPeriod=p; document.getElementById('view').innerHTML=renderWorks(); }
function renderWorks(){
  const all=[...DB.works].sort((a,b)=>b.дата.localeCompare(a.дата));
  const seg=`<div class="seg" style="margin-bottom:${_wPeriod==='month'?'8px':'12px'}">${W_PERIODS.map(([k,l])=>
    `<button class="${_wPeriod===k?'on':''}" onclick="setWPeriod('${k}')">${l}</button>`).join('')}</div>`
    + (_wPeriod==='month'?monthNav('renderWorks'):'');

  if(!all.length) return seg+emptyBox('📋','Пока нет работ','Кнопка «＋ Работа» внизу. Если услуг ещё нет — сначала заведите услугу');

  const works=all.filter(w=>inPeriod(w.дата,_wPeriod));

  // сводка за период. Маржа — только по работам с себестоимостью (с 1 сентября).
  const rev=works.reduce((s,w)=>s+w.цена,0);
  const mw=works.filter(margCounted);
  const mRev=mw.reduce((s,w)=>s+w.цена,0);
  const cost=mw.reduce((s,w)=>s+(w.себестоимость||0),0);
  const marg=mRev-cost;
  let h=seg;
  h+=`<div class="grid-stat" style="margin-bottom:4px">
    <div class="stat"><div class="lab">Выручка</div><div class="num mono">${money(rev)}</div></div>
    <div class="stat"><div class="lab">Маржа</div><div class="num mono" style="color:${mw.length?'var(--green)':'var(--muted)'}">${mw.length?money(marg):'—'}</div></div>
  </div>`;

  if(!works.length) return h+`<div class="empty"><div class="em">🗓️</div><div class="sm">За этот период работ нет</div></div>`;

  // группировка по дням
  const byDay={};
  works.forEach(w=>{ (byDay[w.дата]=byDay[w.дата]||[]).push(w); });
  Object.keys(byDay).sort((a,b)=>b.localeCompare(a)).forEach(day=>{
    const list=byDay[day];
    const dRev=list.reduce((s,w)=>s+w.цена,0);
    h+=`<div class="section-title"><span>${fmtDateFull(day)}</span>
      <span class="muted mono">${list.length} · ${money(dRev)}</span></div>`;
    list.forEach(w=>{
      const svc=sById(w.услуга_id);
      h+=`<div class="card tap" onclick="workSheet('${w.id}')">
        <div class="row between">
          <div class="grow">
            <div class="title ell">${svcInline(svc)} ${esc(w.услуга_назв)}${w.без_склада?' <span class="badge a" style="padding:1px 6px;font-size:10px">задн. числом</span>':''}</div>
            <div class="sm muted ell">${w.формула?esc(w.формула.split('\n')[0]):'без формулы'}</div>
          </div>
          <div class="row" style="gap:10px">
            <div style="text-align:right">
              <div class="title mono">${money(w.цена)}</div>
              ${margCounted(w)?`<div class="xs" style="color:${margLevel(w.маржа,w.цена).c}">${w.маржа<0?'':'+'}${money(w.маржа)}${w.маржа<0?' 🔴':''}</div>`:''}
            </div>
            <span class="iconbtn" onclick="event.stopPropagation();delWork('${w.id}')">🗑</span>
          </div>
        </div>
      </div>`;
    });
  });
  return h;
}
function workSheet(id){
  const w=DB.works.find(x=>x.id===id);
  let steps=w.шаги.map(s=>{
    const m=mById(s.материал_id), ox=s.оксид_id?mById(s.оксид_id):null;
    return `<div class="step-card">
      <b>${esc(s.название||(m?m.название:''))}</b>
      <div class="kv"><span class="k">${m?esc(m.название):'? материал'}</span><span class="v">${s.факт_граммы} г</span></div>
      ${ox?`<div class="kv"><span class="k">${esc(ox.название)}</span><span class="v">${s.факт_оксида} г</span></div>`:''}
    </div>`;
  }).join('');
  const pieces=(w.штучные||[]).map(p=>`<div class="kv"><span class="k">${esc(p.название)}</span><span class="v">${p.кол_во} шт</span></div>`).join('');
  const нормы=(w.нормы||[]).map(n=>`<div class="kv"><span class="k">${esc(n.название)}${
    n.ед==='раб'?'':' · '+fmtG(n.кол)+' '+ЕД[n.ед]}${n.накидка?` <span class="xs">+${n.накидка}%</span>`:''
    }</span><span class="v">${money(нормаСумма(n))}</span></div>`).join('');
  openSheet(esc(w.услуга_назв), `
    <div class="sm muted" style="margin-bottom:10px">${fmtDate(w.дата)} · ${esc(w.услуга_назв)}</div>
    ${w.формула?`<div class="card" style="background:var(--brand-soft);border-color:#e0d6ff"><div class="xs" style="color:var(--brand);font-weight:700;margin-bottom:4px">ФОРМУЛА ИЗ DIKIDI</div><div class="sm mono">${esc(w.формула)}</div></div>`:''}
    ${steps}
    ${pieces?`<div class="card">${pieces}</div>`:''}
    ${нормы?`<div class="section-title"><span>Типовой расход</span></div><div class="card">${нормы}</div>`:''}
    <div class="card">
      <div class="kv"><span class="k">Остаток смеси (в отход)</span><span class="v">${w.остаток_смеси_г} г</span></div>
      <div class="kv"><span class="k">Цена</span><span class="v">${money(w.цена)}</span></div>
      ${margCounted(w)?`<div class="kv"><span class="k">Себестоимость</span><span class="v">${money(w.себестоимость)}</span></div>
      <div class="kv"><span class="k">Маржа</span><span class="v" style="color:${margLevel(w.маржа,w.цена).c}">${money(w.маржа)} · ${w.цена?Math.round(w.маржа/w.цена*100):0}%</span></div>`
      :`<div class="sm muted" style="padding-top:8px">Маржа не считается — работа до ${fmtDay(MARG_FROM)}, материалы по ней не заносились.</div>`}
    </div>
    <button class="btn soft" onclick="copyRecipe('${id}')">📋 Скопировать рецепт для DIKIDI</button>`,
    [`<button class="btn danger wauto" onclick="delWork('${id}')">🗑</button>`,
     `<button class="btn ghost" onclick="editWork('${id}')">✏️ Изменить</button>`]);
}
function editWork(id){
  const w=DB.works.find(x=>x.id===id); if(!w) return;
  const orig={};
  // Для работ, списанных со склада, помним прежние граммы — чтобы availFor не считал их дефицитом при правке.
  if(!w.без_склада) (w.шаги||[]).forEach(s=>{ orig[s.материал_id]=(orig[s.материал_id]||0)+спис(s); });
  _nw={услуга_id:w.услуга_id,
    lines:(w.шаги||[]).map(s=>({материал_id:s.материал_id, граммы:s.факт_граммы})),
    штучные:(w.штучные||[]).map(p=>({id:p.id, кол_во:p.кол_во})),
    // у старых работ норм нет — подставлять задним числом не будем, себестоимость уехала бы
    нормы:(w.нормы||[]).map(n=>({id:n.норма_id, кол:n.кол})),
    остаток:w.остаток_смеси_г||0, формула:w.формула||'', цена:w.цена||0, время:w.время||(sById(w.услуга_id)||{}).время_мин||0,
    _editId:id, _date:w.дата, _noStock:!!w.без_склада, _origByMat:orig};
  drawNewWork();
}
function availFor(mid){ const m=mById(mid); if(!m) return 0; return m.остаток_г + (_nw&&_nw._origByMat?(_nw._origByMat[mid]||0):0); }
function recipeText(w){
  const parts=(w.шаги||[]).map(s=>{
    const m=mById(s.материал_id); let t=(m?m.название:'?')+' — '+s.факт_граммы+' г';
    if(s.оксид_id){ const ox=mById(s.оксид_id); t+=' + '+(ox?ox.название:'оксид')+' — '+s.факт_оксида+' г'; }
    return t;
  });
  let r=parts.join('\n');
  if(w.остаток_смеси_г) r+='\nОстаток смеси: '+w.остаток_смеси_г+' г';
  return r;
}
function copyRecipe(id){
  const w=DB.works.find(x=>x.id===id); const t=recipeText(w);
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(()=>toast('Рецепт скопирован'),()=>fallbackCopy(t)); }
  else fallbackCopy(t);
}
function fallbackCopy(t){
  const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('Рецепт скопирован'); }catch(e){ toast('Скопируйте вручную'); }
  document.body.removeChild(ta);
}
function delWork(id){
  const wch=DB.works.find(x=>x.id===id);
  const msg=(wch&&wch.без_склада)?'Удалить работу? (склад не затрагивается)':'Удалить работу? Списанные материалы вернутся на склад.';
  confirmDo(msg, ()=>{
    const w=DB.works.find(x=>x.id===id);
    // возврат на склад — только если работа реально списывалась
    if(w && !w.без_склада){
      (w.шаги||[]).forEach(s=>{ const m=mById(s.материал_id); if(m)m.остаток_г=Math.round((m.остаток_г+спис(s))*10)/10;
        const ox=mById(s.оксид_id); if(ox)ox.остаток_г+=s.факт_оксида; });
      (w.штучные||[]).forEach(p=>{ const pp=pById(p.id); if(pp)pp.остаток_шт+=списШт(p); });
    }
    DB.works=DB.works.filter(x=>x.id!==id); save(); closeSheet(); go('works'); toast((w&&w.без_склада)?'Удалено':'Удалено, склад пополнен');
  });
}

/* Мастер расчёта новой работы. Строка расхода = {материал_id, граммы}. */
let _nw=null;
function matName(id){ const m=mById(id); return m?m.название:'—'; }
function newWork(svcId){
  if(!DB.services.length) return toast('Сначала добавьте услугу');
  _nw={услуга_id:svcId||DB.services[0].id, lines:[], штучные:[], нормы:[], остаток:0, формула:'',
       _date:todayISO(), _noStock:false};
  loadNwLines();
  drawNewWork();
}
/* Услуга даёт только ориентир по цене и времени — рецепт вставляют из DIKIDI под клиента. */
function loadNwLines(){
  const s=sById(_nw.услуга_id);
  _nw.цена = svcFrom(s);
  _nw.время = s.время_мин||0;
  _nw.нормы = нормыУслуги(s);   // типовой расход подставляется сам, граммы можно поправить
}
/* Разбор вставленной формулы в строки расхода. */
function parseFormula(){
  const el=document.getElementById('nw_formula');
  if(el) _nw.формула=el.value;
  const text=(_nw.формула||'').trim();
  if(!text) return toast('Вставьте формулу');
  const lines=parseFormulaText(text, DB.materials);
  if(!lines.length) return toast('Не удалось распознать формулу');
  _nw.lines=lines; drawNewWork();
  const bad=lines.filter(l=>!l.материал_id).length;
  toast(bad? `Распознано, уточните ${bad} ${plural(bad,'строку','строки','строк')}` : 'Формула распознана ✓');
}
function drawNewWork(){
  const linesHtml=_nw.lines.map((ln,i)=>{
    const m=mById(ln.материал_id);
    const warn=!_nw._noStock && m && ln.граммы>availFor(ln.материал_id);
    const amb=!ln.материал_id && ln.кандидаты && ln.кандидаты.length;
    const bad=!ln.материал_id && !amb;
    const style = amb ? 'border-color:#f2ddb0;background:var(--amber-soft)'
                : bad ? 'border-color:#f3bcbc;background:var(--red-soft)' : '';
    const label = amb ? '<span style="color:var(--amber)">найдено несколько — выберите серию</span>'
                : bad ? '<span style="color:var(--red)">не распознано — выберите</span>'
                : (m?TYPE[m.тип]:'Материал');
    return `<div class="step-card" style="${style}">
      <div class="fld-row" style="gap:8px;align-items:flex-end">
        <label class="fld" style="margin-bottom:0;flex:2">
          <span>${label}</span>
          <select onchange="_nw.lines[${i}].материал_id=this.value||null;_nw.lines[${i}].кандидаты=null;drawNewWork()">
            <option value="">— выбрать —</option>${matOptions(ln.материал_id, amb?ln.кандидаты:null)}
          </select></label>
        <label class="fld" style="margin-bottom:0;flex:1">
          <span>Грамм ${warn?'<span style="color:var(--red)">!</span>':''}</span>
          <input type="number" inputmode="numeric" value="${ln.граммы}" onchange="_nw.lines[${i}].граммы=+this.value;recalcNw()"></label>
        <span class="iconbtn" style="margin-bottom:2px" onclick="_nw.lines.splice(${i},1);drawNewWork()">✕</span>
      </div>
      ${amb?`<div class="xs" style="margin-top:6px;color:var(--amber)">«${esc(ln.raw||'')}»: ${ln.кандидаты.map(cid=>{const c=mById(cid);return c?esc(c.название):'';}).filter(Boolean).join(' / ')}</div>`:''}
      ${bad&&ln.raw?`<div class="xs muted" style="margin-top:6px">Из формулы: «${esc(ln.raw)}»</div>`:''}
      ${warn?`<div class="xs" style="margin-top:6px;color:var(--red)">⚠ не хватает ${fmtG(ln.граммы-availFor(ln.материал_id))} г (доступно ${fmtG(availFor(ln.материал_id))} г) — остаток уйдёт в 0, позиция «пора заказать»</div>`
        :(m?`<div class="xs muted" style="margin-top:6px">Остаток ${fmtG(m.остаток_г)} г · ${money1(gpr(m))}/г · строка ${money(ln.граммы*gpr(m))}</div>`:'')}
    </div>`;
  }).join('');

  openSheet(_nw._editId?'Изменить работу':'Расчёт работы', `
    <label class="fld"><span>Услуга (для цены и статистики)</span>
      <select onchange="_nw.услуга_id=this.value;loadNwLines();drawNewWork()">
        ${DB.services.map(x=>`<option value="${x.id}" ${x.id===_nw.услуга_id?'selected':''}>${esc(x.название)}</option>`).join('')}
      </select></label>

    <div class="fld-row" style="align-items:flex-end">
      <label class="fld" style="flex:1"><span>Дата работы</span>
        <input type="date" value="${_nw._date||''}" onchange="_nw._date=this.value"></label>
      <label class="chk" style="flex:1;margin-bottom:12px" onclick="event.stopPropagation()">
        <input type="checkbox" ${_nw._noStock?'checked':''} onchange="_nw._noStock=this.checked;drawNewWork()">
        <span>Задним числом<br><span class="xs muted">не списывать склад</span></span>
      </label>
    </div>
    ${_nw._noStock?`<div class="sm" style="color:var(--brand);margin:-4px 2px 10px">📌 Прошлая работа: остатки склада не трогаем. Строки расхода можно не заполнять — себестоимость посчитается по тем, что укажешь (иначе 0).</div>`:''}

    <div class="card" style="background:var(--brand-soft);border-color:#e0d6ff">
      <div class="xs" style="color:var(--brand);font-weight:700;margin-bottom:6px">ФОРМУЛА ИЗ DIKIDI</div>
      <textarea id="nw_formula" rows="2" placeholder="10.2 (20гр) + 9.23 (5гр) + 1,5% (60гр)" style="resize:vertical" onchange="_nw.формула=this.value">${esc(_nw.формула||'')}</textarea>
      <button class="btn sm" style="margin-top:8px" onclick="parseFormula()">🔎 Разобрать формулу</button>
    </div>

    <div class="section-title"><span>Сверка расхода</span><span class="link" onclick="_nw.lines.push({материал_id:null,граммы:0});drawNewWork()">＋ строка</span></div>
    ${linesHtml||'<div class="sm muted" style="margin-bottom:10px">Пусто — можно так и оставить. Для консультации, укладки и подобного материалы не тратятся.</div>'}
    <label class="fld"><span>Остаток смеси (в отход), г</span>
      <input type="number" inputmode="numeric" value="${_nw.остаток}" onchange="_nw.остаток=+this.value"></label>

    ${нормыБлок()}

    <label class="fld" style="margin-top:12px"><span>Сколько взяла с клиента, ₽${(()=>{const s=sById(_nw.услуга_id);return s&&svcTo(s)>svcFrom(s)?` <span class="xs muted">(по прайсу ${svcPriceText(s)})</span>`:'';})()}</span>
      <input id="nw_price" type="number" inputmode="numeric" value="${_nw.цена}" onchange="_nw.цена=+this.value;recalcNw()"></label>
    <label class="fld"><span>Время работы, мин (для «доход/час»)</span>
      <input type="number" inputmode="numeric" value="${_nw.время||''}" placeholder="90" onchange="_nw.время=+this.value"></label>
    <div class="card" id="nw_summary"></div>
  `, [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
      `<button class="btn" onclick="saveWork()">💾 ${_nw._editId?'Сохранить':(_nw._noStock?'Добавить работу':'Провести работу')}</button>`]);
  recalcNw();
}
/* Типовой расход в форме работы. Подставился из услуги — обычно править нечего,
   но граммы редактируются, а лишнюю строку можно убрать (мыла не мыла — бывает). */
function нормыБлок(){
  const список=_nw.нормы||[];
  const итог=список.reduce((s,x)=>{const n=нById(x.id); return s+(n?нормаСумма({кол:x.кол,цена:n.цена,накидка:n.накидка}):0);},0);
  const строки=список.map((x,i)=>{
    const n=нById(x.id); if(!n) return '';
    const с=нормаСумма({кол:x.кол, цена:n.цена, накидка:n.накидка});
    const фикс=n.ед==='раб';
    return `<div class="step-card" style="padding:9px 11px;margin-bottom:8px">
      <div class="row" style="gap:9px">
        <div class="grow" style="min-width:0">
          <div class="sm ell" style="font-weight:600">${esc(n.название)}</div>
          <div class="xs muted ell">${фикс?money(n.цена)+' за работу':money1(n.цена)+'/'+ЕД[n.ед]}${n.накидка?` · +${n.накидка}% погрешность`:''}</div>
        </div>
        ${фикс?'':`<input type="number" inputmode="numeric" value="${x.кол}" aria-label="${ЕД[n.ед]}"
          style="flex:none;width:74px;padding:9px;text-align:center"
          onchange="_nw.нормы[${i}].кол=+this.value;drawNewWork()">`}
        <span class="mono" style="flex:none;width:62px;text-align:right">${money(с)}</span>
        <span class="iconbtn" style="flex:none;width:28px;height:28px" onclick="_nw.нормы.splice(${i},1);drawNewWork()">✕</span>
      </div>
    </div>`;
  }).join('');
  const убрали=нормыУслуги(sById(_nw.услуга_id)).filter(x=>!список.find(o=>o.id===x.id));
  return `<div class="section-title"><span>Типовой расход</span><span class="muted mono">${money(итог)}</span></div>
    ${строки||'<div class="sm muted" style="margin-bottom:10px">Пусто. Задаётся в услуге: Услуги → нужная → «Изменить».</div>'}
    ${убрали.length?`<div class="sm muted" style="margin:-2px 2px 10px">Убрано из работы: ${
      убрали.map(x=>esc((нById(x.id)||{}).название)).join(', ')} · <span class="link" onclick="_nw.нормы=нормыУслуги(sById(_nw.услуга_id));drawNewWork()">вернуть</span></div>`:''}`;
}
function addNwPiece(id){
  if(_nw.штучные.find(x=>x.id===id)) return;
  _nw.штучные.push({id, кол_во:1}); drawNewWork();
}
function nwCost(){
  const шаги=_nw.lines.filter(l=>l.материал_id).map(l=>({материал_id:l.материал_id, факт_граммы:l.граммы, факт_оксида:0}));
  const штучные=_nw.штучные.map(p=>{const pp=pById(p.id);return {...p, цена_за_штуку:pp?pp.цена_за_штуку:0};});
  return calcCost({шаги, штучные, нормы:снимокНорм(_nw.нормы)}, DB.materials);
}
function recalcNw(){
  const cost=nwCost();
  const price=_nw.цена||0; const marg=price-cost;
  const lvl=margLevel(marg, price);
  const el=document.getElementById('nw_summary'); if(!el)return;
  const short=_nw._noStock?0:_nw.lines.filter(l=>{const m=mById(l.материал_id); return m && l.граммы>availFor(l.материал_id);}).length;
  const нормыС=Math.round(снимокНорм(_nw.нормы).reduce((s,n)=>s+нормаСумма(n),0));
  el.innerHTML=`
    ${нормыС?`<div class="kv"><span class="k">Материалы по формуле</span><span class="v">${money(cost-нормыС)}</span></div>
    <div class="kv"><span class="k">Типовой расход</span><span class="v">${money(нормыС)}</span></div>`:''}
    <div class="kv"><span class="k">Себестоимость</span><span class="v">${money(cost)}</span></div>
    <div class="kv"><span class="k">Цена (доход)</span><span class="v">${money(price)}</span></div>
    <div class="kv"><span class="k">Маржа</span><span class="v" style="color:${lvl.c}">${money(marg)} · ${price?Math.round(marg/price*100):0}%${lvl.t?' · '+lvl.t:''}</span></div>
    ${lvl.b==='r'?`<div class="sm" style="color:var(--red);margin-top:8px;font-weight:700">🔴 Работа в минус: цена ниже себестоимости на ${money(-marg)}</div>`
      :lvl.b==='a'?`<div class="sm" style="color:var(--amber);margin-top:8px">🟡 Низкая маржа — материалы съедают ${price?Math.round(cost/price*100):0}% цены</div>`:''}
    ${short?`<div class="sm" style="color:var(--red);margin-top:6px">⚠ ${short} ${plural(short,'позиции','позиций','позиций')} не хватает на складе — проведётся, остаток уйдёт в 0</div>`:''}`;
}
function saveWork(){
  const s=sById(_nw.услуга_id);
  const noStock=!!_nw._noStock;
  const bad=_nw.lines.filter(l=>!l.материал_id).length;
  const шаги=_nw.lines.filter(l=>l.материал_id).map(l=>({название:matName(l.материал_id), материал_id:l.материал_id, факт_граммы:l.граммы, оксид_id:null, факт_оксида:0}));
  // Формула необязательна: у консультации, укладки и подобных материалов нет вовсе.
  // Пустая работа = чистый доход без себестоимости, это законный случай.
  const штучные=_nw.штучные.map(p=>{const pp=pById(p.id);return {id:p.id, название:pp?pp.название:'?', кол_во:p.кол_во, цена_за_штуку:pp?pp.цена_за_штуку:0};});
  // Режим редактирования: возвращаем на склад старую работу (только если она списывалась), потом списываем новую
  if(_nw._editId){
    const orig=DB.works.find(x=>x.id===_nw._editId);
    if(orig){
      if(!orig.без_склада){
        (orig.шаги||[]).forEach(st=>{ const m=mById(st.материал_id); if(m)m.остаток_г=Math.round((m.остаток_г+спис(st))*10)/10; });
        (orig.штучные||[]).forEach(p=>{ const pp=pById(p.id); if(pp)pp.остаток_шт+=списШт(p); });
      }
      DB.works=DB.works.filter(x=>x.id!==_nw._editId);
    }
  }
  const today=todayISO();
  const нормы=снимокНорм(_nw.нормы);
  const w={ id:_nw._editId||uid('w'), дата:_nw._date||today, услуга_id:s.id, услуга_назв:s.название,
    шаги, остаток_смеси_г:_nw.остаток||0, время:_nw.время||0,
    штучные, нормы, цена:_nw.цена||0, формула:_nw.формула||'', без_склада:noStock };
  w.себестоимость=calcCost({шаги, штучные, нормы}, DB.materials);
  w.маржа=w.цена-w.себестоимость;
  let zeroed=0;
  if(!noStock){
    // Запоминаем, сколько ушло СО СКЛАДА, а не сколько просила формула: при нехватке
    // остаток упирается в ноль. Без этого удаление работы вернуло бы полную цифру
    // и дорисовало на склад граммы, которых там никогда не было.
    шаги.forEach(st=>{ const m=mById(st.материал_id); if(!m){ st.списано=0; return; }
      if(st.факт_граммы>m.остаток_г) zeroed++;
      st.списано=Math.min(st.факт_граммы, m.остаток_г);
      m.остаток_г=Math.round((m.остаток_г-st.списано)*10)/10; });
    штучные.forEach(p=>{ const pp=pById(p.id); if(!pp){ p.списано=0; return; }
      p.списано=Math.min(p.кол_во, pp.остаток_шт);
      pp.остаток_шт-=p.списано; });
  }
  const wasEdit=!!_nw._editId;
  const былП=_wPeriod, былМ=_monthOff;   // работа задним числом иначе пропала бы из фильтра
  _wPeriod=periodShowing(w.дата, _wPeriod);
  DB.works.push(w); save(); closeSheet(); go('works');
  const notes=[];
  if(bad) notes.push(`${bad} нераспозн. строк пропущено`);
  if(zeroed) notes.push(`${zeroed} позиц. в 0`);
  if(w.маржа<0) notes.push('⚠ в минус');
  const base = wasEdit ? 'Работа изменена' : (noStock ? 'Работа добавлена (задним числом)' : 'Работа проведена');
  // «склад обновлён» — только если реально списывали
  const tail = notes.length ? ' · '+notes.join(' · ') : ((noStock || !шаги.length) ? '' : ', склад обновлён');
  const сменился = _wPeriod!==былП || _monthOff!==былМ;
  toast(base + tail + (сменился ? ' · показан '+(_wPeriod==='month'?monthLabel():'весь период') : ''));
}
