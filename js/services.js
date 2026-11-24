/* ==================== ЦЕХ «УСЛУГИ» ====================
   Прайс-лист: вилки цены и времени, иконка, типовой расход услуги, факт по журналу.
   Подробно: docs/workshops/services.md */

/* ==================== УСЛУГИ ==================== */
/* Услуга — строка прайс-листа: {название, иконка, цена_от, цена_до, время_мин}.
   Рецепт тут не хранится: формула у каждого клиента своя, её вставляют при расчёте работы.
   svcFrom/svcTo понимают и старый формат (одно поле «цена»). */
function svcFrom(s){ return s.цена_от!=null ? (s.цена_от||0) : (s.цена||0); }
function svcTo(s){ return s.цена_до ? s.цена_до : svcFrom(s); }
function svcPriceText(s){
  const a=svcFrom(s), b=svcTo(s);
  return b>a ? money(a)+' – '+money(b) : money(a);
}
function svcTimeTo(s){ return s.время_до ? s.время_до : (s.время_мин||0); }
function fmtHrs(min){
  if(!min) return '—';
  if(min<60) return min+' мин';
  const h=min/60;
  return (Math.round(h*10)/10).toLocaleString('ru-RU')+' ч';
}
function svcTimeText(s){
  const a=s.время_мин||0, b=svcTimeTo(s);
  if(!a) return '—';
  return b>a ? fmtHrs(a)+' – '+fmtHrs(b) : fmtHrs(a);
}
/* Факт по услуге из журнала работ — прайс показывает реальные цифры, а не гипотетические. */
function svcStats(s){
  const ws=DB.works.filter(w=>w.услуга_id===s.id);
  if(!ws.length) return null;
  const rev=ws.reduce((x,w)=>x+(w.цена||0),0);
  // маржа — только по работам с реальной себестоимостью (см. MARG_FROM)
  const mw=ws.filter(margCounted);
  const mRev=mw.reduce((x,w)=>x+(w.цена||0),0);
  const cost=mw.reduce((x,w)=>x+(w.себестоимость||0),0);
  return {n:ws.length, rev, cost, avg:Math.round(rev/ws.length),
          mn:mw.length, mRev, marg:mRev-cost, margPct:mRev?Math.round((mRev-cost)/mRev*100):0,
          min:Math.min(...ws.map(w=>w.цена||0)), max:Math.max(...ws.map(w=>w.цена||0))};
}
function renderServices(){
  let h='<div class="sm muted" style="margin:2px 2px 10px">Прайс-лист. Цены ориентировочные — точную сумму вписываешь при проведении работы.</div>';
  if(!DB.services.length) h += emptyBox('✂️','Нет услуг','Добавьте первую услугу');
  DB.services.forEach(s=>{
    const st=svcStats(s);
    const sub = st ? `${st.n} ${plural(st.n,'работа','работы','работ')} · ср. чек ${money(st.avg)}`
                   : (s.время_мин?svcTimeText(s):'ещё не проводилась');
    h += `<div class="card tap" onclick="svcSheet('${s.id}')">
      <div class="row between">
        <div class="row grow" style="gap:11px; min-width:0">
          ${svcCircle(s)}
          <div class="grow" style="min-width:0">
            <div class="title ell">${esc(s.название)}</div>
            <div class="sm muted ell" style="margin-top:2px">${sub}</div>
          </div>
        </div>
        <div style="text-align:right; flex:none; padding-left:8px">
          <div class="title mono" style="white-space:nowrap">${svcPriceText(s)}</div>
          ${st&&st.mn?`<div class="xs" style="color:${margLevel(st.marg,st.mRev).c}">маржа ${st.margPct}%</div>`
              :''}
        </div>
      </div>
    </div>`;
  });
  return h;
}
function svcSheet(id){
  const s=sById(id);
  const st=svcStats(s);
  openSheet(esc(s.название), `
    <div class="card">
      <div class="kv"><span class="k">Цена по прайсу</span><span class="v">${svcPriceText(s)}</span></div>
      <div class="kv"><span class="k">Время</span><span class="v">${svcTimeText(s)}</span></div>
      ${(()=>{ // в час: худший расклад (мин. цена за макс. время) — лучший (макс. цена за мин. время)
        if(!s.время_мин||!svcFrom(s)) return '';
        const lo=svcFrom(s)/(svcTimeTo(s)/60), hi=svcTo(s)/(s.время_мин/60);
        return `<div class="kv"><span class="k">Выходит в час</span><span class="v">${Math.round(hi)>Math.round(lo)?money(lo)+' – '+money(hi):money(hi)}/ч</span></div>`;
      })()}
      ${s.заметка?`<div class="sm muted" style="padding-top:8px">📌 ${esc(s.заметка)}</div>`:''}
    </div>
    ${(()=>{
      const нн=снимокНорм(нормыУслуги(s));
      if(!нн.length) return '';
      const итог=нн.reduce((x,n)=>x+нормаСумма(n),0);
      return `<div class="section-title"><span>Типовой расход</span><span class="muted mono">${money(итог)}</span></div>
      <div class="card">${нн.map(n=>`<div class="kv"><span class="k">${esc(n.название)}${
        n.ед==='раб'?'':' · '+fmtG(n.кол)+' '+ЕД[n.ед]}${n.накидка?` <span class="xs">+${n.накидка}%</span>`:''
        }</span><span class="v">${money(нормаСумма(n))}</span></div>`).join('')}</div>`;
    })()}
    ${st?`<div class="section-title"><span>Факт по журналу</span></div>
    <div class="card">
      <div class="kv"><span class="k">Проведено работ</span><span class="v">${st.n}</span></div>
      <div class="kv"><span class="k">Средний чек</span><span class="v">${money(st.avg)}${st.max>st.min?` <span class="xs muted">(${money(st.min)}–${money(st.max)})</span>`:''}</span></div>
      <div class="kv"><span class="k">Всего выручки</span><span class="v">${money(st.rev)}</span></div>
      ${st.mn?`<div class="kv"><span class="k">Материалы съели</span><span class="v">${money(st.cost)}</span></div>
      <div class="kv"><span class="k">Заработано чистыми</span><span class="v" style="color:${margLevel(st.marg,st.mRev).c}">${money(st.marg)} · ${st.margPct}%</span></div>
      ${st.mn<st.n?`<div class="sm muted" style="padding-top:8px">Маржа — по ${st.mn} ${plural(st.mn,'работе','работам','работам')} с ${fmtDay(MARG_FROM)}</div>`:''}`
      :`<div class="sm muted" style="padding-top:8px">Маржа считается с ${fmtDay(MARG_FROM)}</div>`}
    </div>`
    :`<div class="sm muted" style="margin:2px 2px 12px">Работ ещё не было</div>`}
    <button class="btn" onclick="closeSheet();newWork('${id}')">▶️ Провести работу</button>`,
    [`<button class="btn danger wauto" onclick="delService('${id}')">🗑</button>`,
     `<button class="btn ghost" onclick="editService('${id}')">✏️ Изменить</button>`]);
}
function delService(id){ confirmDo('Удалить услугу?', ()=>{
  DB.services=DB.services.filter(s=>s.id!==id); save(); closeSheet(); go('services'); toast('Удалено'); }); }
let _seIcon='капля', _seНормы=[], _seБезОбщих=false;
function pickSeIcon(k){ _seIcon=k; document.querySelectorAll('#seIcons .icpick').forEach(b=>b.classList.toggle('on', b.dataset.k===k)); }
/* Редактор типового расхода в услуге. Показываем сразу все нормы: 0 — значит не используется,
   добавлять-удалять строки не надо. Общие («Мелочь») отдельно, их можно отключить целиком. */
function seНормыКол(id){ const x=_seНормы.find(o=>o.id===id); return x?x.кол:0; }
function setSeНорма(id, v){
  const кол=+v||0, i=_seНормы.findIndex(o=>o.id===id);
  if(i>=0) _seНормы[i].кол=кол; else _seНормы.push({id, кол});
  drawSeНормы();
}
function drawSeНормы(){
  const box=document.getElementById('seНормы'); if(!box) return;
  const свои=(DB.нормы||[]).filter(n=>!n.всем);
  const общие=(DB.нормы||[]).filter(n=>n.всем);
  let итог=свои.reduce((s,n)=>s+нормаСумма({кол:seНормыКол(n.id), цена:n.цена, накидка:n.накидка}),0);
  if(!_seБезОбщих) итог+=общие.reduce((s,n)=>s+нормаСумма({кол:1, цена:n.цена, накидка:n.накидка}),0);
  box.innerHTML = (свои.length?svoiHtml(свои):'<div class="sm muted">Справочник норм пуст</div>')
    + (общие.length?`<div class="divider"></div>
      <label class="chk" style="margin-bottom:6px">
        <input type="checkbox" ${_seБезОбщих?'':'checked'} onchange="_seБезОбщих=!this.checked;drawSeНормы()">
        <span>${общие.map(n=>esc(n.название)+' — '+money(нормаСумма({кол:1,цена:n.цена,накидка:n.накидка}))).join(', ')}</span>
      </label>`:'');
  const t=document.getElementById('seНормыИтог'); if(t) t.textContent=money(итог);
}
function svoiHtml(свои){
  return свои.map(n=>{
    const кол=seНормыКол(n.id);
    return `<div class="row" style="gap:9px;padding:6px 0">
      <div class="grow" style="min-width:0">
        <div class="sm ell" style="font-weight:600">${esc(n.название)}</div>
        <div class="xs muted">${money1(n.цена)}/${ЕД[n.ед]}</div>
      </div>
      <input type="number" inputmode="numeric" value="${кол||''}" placeholder="0" aria-label="${ЕД[n.ед]}"
        style="flex:none;width:74px;padding:9px;text-align:center"
        onchange="setSeНорма('${n.id}',this.value)">
      <span class="mono xs muted" style="flex:none;width:58px;text-align:right">${кол?money(нормаСумма({кол,цена:n.цена,накидка:n.накидка})):'—'}</span>
    </div>`;
  }).join('');
}
function editService(id){
  const s = id?sById(id):{id:uid('s'), название:'', иконка:'капля', цена_от:2000, цена_до:0, время_мин:60};
  _seIcon = SVC_ICONS[s.иконка]?s.иконка:'капля';
  _seНормы = (s.нормы||[]).map(x=>({id:x.id, кол:x.кол||0}));
  _seБезОбщих = !!s.без_общих;
  openSheet(id?'Изменить услугу':'Новая услуга', `
    <label class="fld"><span>Название</span><input id="se_name" value="${esc(s.название)}" placeholder="Окрашивание в один тон"></label>
    <label class="fld"><span>Иконка</span>
      <div id="seIcons" class="icrow">${SVC_ICON_KEYS.map(k=>`<button type="button" class="icpick ${k===_seIcon?'on':''}" data-k="${k}" onclick="pickSeIcon('${k}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SVC_ICONS[k]}</svg></button>`).join('')}</div>
    </label>
    <div class="fld-row">
      <label class="fld"><span>Цена от, ₽</span><input id="se_price" type="number" inputmode="numeric" value="${svcFrom(s)||''}" placeholder="2500"></label>
      <label class="fld"><span>Цена до, ₽ <span class="xs muted">(не обяз.)</span></span><input id="se_price2" type="number" inputmode="numeric" value="${svcTo(s)>svcFrom(s)?svcTo(s):''}" placeholder="—"></label>
    </div>
    <div class="fld-row">
      <label class="fld"><span>Время от, мин</span><input id="se_time" type="number" inputmode="numeric" value="${s.время_мин||''}" placeholder="90"></label>
      <label class="fld"><span>Время до, мин <span class="xs muted">(не обяз.)</span></span><input id="se_time2" type="number" inputmode="numeric" value="${svcTimeTo(s)>(s.время_мин||0)?svcTimeTo(s):''}" placeholder="—"></label>
    </div>
    <label class="fld"><span>Примечание <span class="xs muted">(не обяз.)</span></span>
      <input id="se_note" value="${esc(s.заметка||'')}" placeholder="доплата за густоту/длину до 5000 ₽"></label>
    <div class="section-title"><span>Типовой расход</span><span class="muted mono" id="seНормыИтог"></span></div>
    <div class="card" id="seНормы"></div>
  `, [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
      `<button class="btn" onclick="saveService('${id||''}','${s.id}')">Сохранить</button>`]);
  drawSeНормы();
}
function saveService(id, newId){
  const g=x=>document.getElementById(x).value;
  const name=g('se_name').trim(); if(!name) return toast('Введите название');
  let от=+g('se_price')||0, до=+g('se_price2')||0;
  if(до && до<от) [от,до]=[до,от];          // перепутали местами — сами поправим
  if(до===от) до=0;                          // одинаковые = фиксированная цена
  let тот=+g('se_time')||0, тдо=+g('se_time2')||0;
  if(тдо && тдо<тот) [тот,тдо]=[тдо,тот];
  if(тдо===тот) тдо=0;
  const obj={ id:id||newId, название:name, иконка:_seIcon||'капля',
    цена_от:от, цена_до:до, время_мин:тот, время_до:тдо, заметка:g('se_note').trim(),
    нормы:_seНормы.filter(x=>x.кол>0 && нById(x.id)), без_общих:_seБезОбщих };
  if(id){ const i=DB.services.findIndex(s=>s.id===id); DB.services[i]=obj; }
  else DB.services.push(obj);
  save(); closeSheet(); go('services'); toast('Сохранено');
}
