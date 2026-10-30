/* ==================== ЦЕХ «ОТЧЁТ» ====================
   Аналитика за период: выручка, расход, прибыль, доход в час, сезонность, услуги, «Внимание».
   Только читает DB. Подробно: docs/workshops/report.md */

/* ==================== ОТЧЁТ (аналитика) ==================== */
let _repPeriod='month';
const MONTHS_SHORT=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function setRepPeriod(p){ _repPeriod=p; document.getElementById('view').innerHTML=renderReport(); }
function workHours(w){ const t = w.время || ((sById(w.услуга_id)||{}).время_мин) || 0; return t/60; }
function renderReport(){
  const works=DB.works.filter(w=>inPeriod(w.дата,_repPeriod));
  const exps=(DB.expenses||[]).filter(e=>inPeriod(e.дата,_repPeriod));

  const rev=works.reduce((s,w)=>s+w.цена,0);
  const spend=exps.reduce((s,e)=>s+(e.сумма||0),0);
  const profit=rev-spend;
  const margWorks=works.filter(margCounted);          // маржа только с MARG_FROM
  const cost=margWorks.reduce((s,w)=>s+(w.себестоимость||0),0);
  const hours=works.reduce((s,w)=>s+workHours(w),0);

  const seg=`<div class="seg" style="margin-bottom:${_repPeriod==='month'?'8px':'12px'}">${W_PERIODS.map(([k,l])=>
    `<button class="${_repPeriod===k?'on':''}" onclick="setRepPeriod('${k}')">${l}</button>`).join('')}</div>`
    + (_repPeriod==='month'?monthNav('renderReport'):'');

  let h=seg;
  h+=`<div class="grid-stat">
    <div class="stat"><div class="lab">Выручка</div><div class="num mono">${money(rev)}</div></div>
    <div class="stat"><div class="lab">Расход</div><div class="num mono">${money(spend)}</div></div>
    <div class="stat"><div class="lab">Прибыль</div><div class="num mono" style="color:${profit>=0?'var(--green)':'var(--red)'}">${money(profit)}</div></div>
    <div class="stat"><div class="lab">Работ</div><div class="num mono">${works.length}</div></div>
  </div>`;
  h+=`<div class="card" style="margin-top:4px">
    <div class="kv"><span class="k">Средний чек</span><span class="v">${money(works.length?rev/works.length:0)}</span></div>
    <div class="kv"><span class="k">Доход в час</span><span class="v">${money(hours?rev/hours:0)}/ч</span></div>
    <div class="kv"><span class="k">Часов отработано</span><span class="v">${Math.round(hours*10)/10} ч</span></div>
  </div>`;

  // Расход по категориям (за период)
  const expByCat={}; exps.forEach(e=>expByCat[e.категория]=(expByCat[e.категория]||0)+(e.сумма||0));
  const catKeys=EXP_CAT_KEYS.filter(k=>expByCat[k]).sort((a,b)=>expByCat[b]-expByCat[a]);
  if(catKeys.length){
    h+=`<div class="section-title"><span>Расход по категориям</span></div>
      <div class="card">${catKeys.map(k=>`<div class="kv"><span class="k">${EXP_CATS[k]}</span><span class="v">${money(expByCat[k])}</span></div>`).join('')}</div>`;
  }

  // Сезонность — выручка по месяцам (всё время)
  const byMonth={};
  DB.works.forEach(w=>{ const k=w.дата.slice(0,7); byMonth[k]=(byMonth[k]||0)+w.цена; });
  const mk=Object.keys(byMonth).sort().slice(-8);
  if(mk.length>=2){
    const max=Math.max(...mk.map(k=>byMonth[k]));
    const best=mk.reduce((a,b)=>byMonth[b]>byMonth[a]?b:a, mk[0]);
    h+=`<div class="section-title"><span>Выручка по месяцам</span></div>
      <div class="card"><div class="mbars">${mk.map(k=>{
        const hp=Math.max(6, Math.round(byMonth[k]/max*100));
        const [y,mo]=k.split('-'); const isBest=k===best;
        return `<div class="mbar"><div class="mbar-v">${byMonth[k]>=1000?Math.round(byMonth[k]/1000)+'к':byMonth[k]}</div>
          <div class="mbar-t"><i style="height:${hp}%;background:${isBest?'var(--brand)':'var(--brand-soft)'}"></i></div>
          <div class="mbar-l">${MONTHS_SHORT[+mo-1]}</div></div>`;
      }).join('')}</div>
      <div class="sm muted" style="margin-top:8px">Лучший месяц: <b style="color:var(--brand)">${MONTHS_SHORT[+best.split('-')[1]-1]} ${best.split('-')[0]}</b> · ${money(byMonth[best])}</div></div>`;
  }

  // По услугам
  const bySvc={};
  works.forEach(w=>{ const o=bySvc[w.услуга_назв]=bySvc[w.услуга_назв]||{n:0,rev:0,marg:0,mn:0,mRev:0};
    o.n++; o.rev+=w.цена;
    if(margCounted(w)){ o.mn++; o.mRev+=w.цена; o.marg+=(w.маржа||0); } });
  const keys=Object.keys(bySvc);
  if(keys.length){
    const byRev=[...keys].sort((a,b)=>bySvc[b].rev-bySvc[a].rev);
    const topFreq=[...keys].sort((a,b)=>bySvc[b].n-bySvc[a].n)[0];
    const maxRev=bySvc[byRev[0]].rev;
    h+=`<div class="section-title"><span>По услугам</span></div>`;
    h+=`<div class="sm muted" style="margin:-4px 2px 8px">💰 Больше всех приносит: <b>${esc(byRev[0])}</b> · 🔁 чаще всего: <b>${esc(topFreq)}</b></div>`;
    byRev.forEach(k=>{const o=bySvc[k]; const rp=o.mRev?Math.round(o.marg/o.mRev*100):0;
      h+=`<div class="card">
        <div class="row between">
          <div class="grow"><div class="title ell">${esc(k)}</div>
            <div class="sm muted">${o.n} ${plural(o.n,'работа','работы','работ')} · ср. чек ${money(o.rev/o.n)}</div></div>
          <div style="text-align:right"><div class="title mono">${money(o.rev)}</div>
          ${o.mn?`<div class="xs" style="color:${margLevel(o.marg,o.mRev).c}">маржа ${rp}%</div>`:''}</div>
        </div>
        <div class="bar" style="margin-top:9px"><i style="width:${Math.max(4,Math.round(o.rev/maxRev*100))}%"></i></div>
      </div>`;
    });
  } else h+=`<div class="empty"><div class="em">📊</div><div class="sm">За период работ нет</div></div>`;

  // Итоги за всё время
  const allRev=DB.works.reduce((s,w)=>s+w.цена,0);
  const allSpend=(DB.expenses||[]).reduce((s,e)=>s+(e.сумма||0),0);
  const matSpend=(DB.expenses||[]).filter(e=>e.категория==='материалы').reduce((s,e)=>s+e.сумма,0);
  const stockVal=DB.materials.reduce((s,m)=>s+m.остаток_г*gpr(m),0)+DB.pieces.reduce((s,p)=>s+p.остаток_шт*p.цена_за_штуку,0);
  h+=`<div class="section-title"><span>Итоги за всё время</span></div>
    <div class="card">
      <div class="kv"><span class="k">Общая выручка</span><span class="v">${money(allRev)}</span></div>
      <div class="kv"><span class="k">Общий расход</span><span class="v">${money(allSpend)}</span></div>
      <div class="kv"><span class="k">Из них закуп материалов</span><span class="v">${money(matSpend)}</span></div>
      <div class="kv"><span class="k">Прибыль (касса)</span><span class="v" style="color:${allRev-allSpend>=0?'var(--green)':'var(--red)'}">${money(allRev-allSpend)}</span></div>
      <div class="kv"><span class="k">Заморожено в складе</span><span class="v">${money(stockVal)}</span></div>
      <div class="kv"><span class="k">Вложено в оборудование</span><span class="v">${money(equipTotal())}</span></div>
    </div>
    <div class="sm muted" style="margin:6px 2px 0">«Прибыль (касса)» — реальные деньги: выручка минус все траты. Маржа по услуге (цена − себестоимость) — отдельная метрика для ценообразования.</div>`;

  // Внимание
  const minusN=margWorks.filter(w=>w.маржа<0).length;
  let wasteG=0, wasteR=0;
  works.forEach(w=>{ if(!w.остаток_смеси_г) return; let totG=0,totC=0;
    (w.шаги||[]).forEach(st=>{ const m=mById(st.материал_id); if(m){ totG+=st.факт_граммы; totC+=st.факт_граммы*gpr(m);
      const ox=st.оксид_id?mById(st.оксид_id):null; if(ox){ totG+=st.факт_оксида; totC+=st.факт_оксида*gpr(ox);} } });
    if(totG>0){ wasteG+=w.остаток_смеси_г; wasteR+=w.остаток_смеси_г/totG*totC; } });
  if(minusN||wasteG){
    h+=`<div class="section-title"><span>Внимание</span></div><div class="card">
      <div class="kv"><span class="k">Работы в минус</span><span class="v" style="color:${minusN?'var(--red)':'var(--green)'}">${minusN?minusN+' 🔴':'нет'}</span></div>
      <div class="kv"><span class="k">Смесь в отход</span><span class="v">${fmtG(wasteG)} г ≈ ${money(wasteR)}</span></div>
    </div>`;
  }
  h+=`<div style="height:12px"></div>`;
  return h;
}
