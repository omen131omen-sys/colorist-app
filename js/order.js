/* ==================== ЦЕХ «ЗАКАЗ» ====================
   Заказ поставщику: позиции «мало» и «на исходе» раскладываются по поставщикам (поставщик
   привязан к брендам), количество упаковок правится, текст заказа уходит в Telegram, WhatsApp,
   на почту или через «Поделиться» — одним нажатием, без набора руками.
   Данные: DB.поставщики [{id, название, бренды:[…], канал:'tg'|'wa'|'mail'|'share', контакт, подпись}].
   Это сообщение менеджеру, не заказ в учётную систему дистрибьютора: для неё нужен их формат. */

const КАНАЛЫ={tg:'Telegram', wa:'WhatsApp', mail:'Почта', share:'Выбрать при отправке'};
const КНОПКА_КАНАЛА={tg:'в Telegram', wa:'в WhatsApp', mail:'на почту', share:''};

/* ---------- логика (без DOM — покрыта тестами) ---------- */
const _бренд=s=>(s||'').trim().toLowerCase();
function поставщикДля(m, поставщики){
  const b=_бренд(m.бренд); if(!b || b==='—') return null;
  return (поставщики||[]).find(p=>(p.бренды||[]).some(x=>_бренд(x)===b)) || null;
}
/* Сколько упаковок: чтобы остаток снова был с запасом — вдвое выше минимального. Не меньше одной. */
function сколькоЗаказать(m){
  const нужно=2*(m.мин_остаток_г||0)-(m.остаток_г||0);
  return Math.max(1, Math.ceil(нужно/(m.нетто_г||1)));
}
/* Как позиция звучит в сообщении: без слова «Краска»; у оксидов и ухода — объём, там фасовки разные. */
function позицияЗаказа(m){
  const имя=m.название.replace(/^краска\s+/i,'').trim();
  return m.тип!=='краска' && m.объём_мл ? `${имя}, ${m.объём_мл} мл` : имя;
}
function текстЗаказа(строки, подпись){
  return 'Здравствуйте! Хочу заказать:\n'
    + строки.map(s=>`• ${позицияЗаказа(s.m)} — ${s.кол} уп.`).join('\n')
    + '\nСпасибо!' + (подпись&&подпись.trim() ? ' '+подпись.trim() : '');
}
/* Ссылка, которая открывает чат с уже набранным текстом. share — ссылки нет, будет «Поделиться». */
function ссылкаЗаказа(p, текст){
  const t=encodeURIComponent(текст), к=(p.контакт||'').trim();
  if(p.канал==='tg'){
    const тел=к.replace(/[\s()-]/g,'');
    if(/^\+?\d{10,15}$/.test(тел)) return `https://t.me/+${тел.replace(/^\+/,'')}?text=${t}`;
    const ник=к.replace(/^https?:\/\/t\.me\//i,'').replace(/^@/,'').replace(/[/?].*$/,'');
    return ник ? `https://t.me/${ник}?text=${t}` : null;
  }
  if(p.канал==='wa'){
    let ц=к.replace(/\D/g,'');
    if(ц.length===11 && ц[0]==='8') ц='7'+ц.slice(1);     // 8 900… — российский номер без +7
    return ц ? `https://wa.me/${ц}?text=${t}` : null;
  }
  if(p.канал==='mail') return к ? `mailto:${к}?subject=${encodeURIComponent('Заказ')}&body=${t}` : null;
  return null;
}
/* Группы заказа: позиции «мало» и «на исходе», по поставщику, а без поставщика — по бренду.
   В группе сначала «мало», дальше порядок палитры. Группы с поставщиком — первыми. */
function группыЗаказа(materials, поставщики){
  const нужные=sortMats(materials.filter(m=>{ const b=stockState(m).badge; return b==='r'||b==='a'; }));
  const группы=new Map();
  нужные.forEach(m=>{
    const p=поставщикДля(m, поставщики);
    const ключ=p ? 'p:'+p.id : 'b:'+(_бренд(m.бренд)||'—');
    if(!группы.has(ключ)) группы.set(ключ, {ключ, поставщик:p, бренд:(m.бренд&&m.бренд!=='—')?m.бренд.trim():'Без бренда', позиции:[]});
    группы.get(ключ).позиции.push({m, мало:stockState(m).badge==='r'});
  });
  const out=[...группы.values()];
  out.forEach(g=>g.позиции.sort((a,b)=>(b.мало?1:0)-(a.мало?1:0)));
  return out.sort((a,b)=>(b.поставщик?1:0)-(a.поставщик?1:0) || b.позиции.filter(x=>x.мало).length-a.позиции.filter(x=>x.мало).length);
}

/* ---------- шторка «Заказать» ---------- */
let _зак=null;   // выбор и количество — живут, пока шторка открыта; при новом открытии всё заново
function открытьЗаказ(){ _зак=null; orderSheet(); }
function orderSheet(){
  const группы=группыЗаказа(DB.materials, DB.поставщики);
  if(!группы.length) return toast('Всё в норме — заказывать нечего ✅');
  if(!_зак){
    _зак={выбор:{}, кол:{}};
    группы.forEach(g=>g.позиции.forEach(x=>{ _зак.выбор[x.m.id]=x.мало; _зак.кол[x.m.id]=сколькоЗаказать(x.m); }));
  }
  const ед=n=>n+' уп.';
  const тело=группы.map((g,gi)=>{
    const p=g.поставщик;
    const выбраны=g.позиции.filter(x=>_зак.выбор[x.m.id]);
    const уп=выбраны.reduce((s,x)=>s+_зак.кол[x.m.id],0);
    const сумма=выбраны.reduce((s,x)=>s+_зак.кол[x.m.id]*(x.m.цена_упаковки||0),0);
    const строки=g.позиции.map(x=>{
      const m=x.m, on=!!_зак.выбор[m.id], дн=хватитДней(m, DB.works, todayISO());
      const под = m.остаток_г<=0 ? 'закончился'
        : x.мало ? `осталось ${fmtG(m.остаток_г)} г · мало`
        : `${fmtG(m.остаток_г)} г · ${дн?подписьХватит(дн):'на исходе'}`;
      return `<div class="orow${on?'':' off'}">
        <button class="box${on?' on':''}" onclick="_зак.выбор['${m.id}']=!_зак.выбор['${m.id}'];перерисоватьЗаказ()" aria-label="${on?'Убрать из заказа':'Добавить в заказ'}"></button>
        <div class="nm"><div>${esc(позицияЗаказа(m))}</div><div style="color:${x.мало?'var(--red)':'var(--amber)'}">${esc(под)}</div></div>
        <div class="qty"><button onclick="кол('${m.id}',-1)" aria-label="Меньше">−</button><b>${ед(_зак.кол[m.id])}</b><button onclick="кол('${m.id}',1)" aria-label="Больше">+</button></div>
      </div>`;
    }).join('');
    const кнопка = p
      ? (уп ? `<button class="btn" style="margin-top:12px" onclick="отправитьЗаказ(${gi})">Отправить${КНОПКА_КАНАЛА[p.канал]?' '+КНОПКА_КАНАЛА[p.канал]:''} · ${ед(уп)}</button>`
            : `<button class="btn" style="margin-top:12px" disabled>Отметь, что заказать</button>`)
      : `<button class="btn soft" style="margin-top:12px" onclick="поставщикSheet(null,${esc(JSON.stringify(g.бренд))},'заказ')">Указать поставщика</button>`;
    return `<div class="card">
      <div class="row between" style="align-items:flex-start;margin-bottom:2px">
        <div class="grp">${esc(p?p.название:g.бренд)}<small>${p?esc(КАНАЛЫ[p.канал]+(p.контакт?' · '+p.контакт:'')):'поставщик не указан'}</small></div>
        ${сумма?`<span class="mono" style="flex:none">≈ ${money(сумма)}</span>`:''}</div>
      ${строки}${кнопка}</div>`;
  }).join('');
  openSheet('Заказать', `
    ${тело}`,
    [`<button class="btn ghost" onclick="_зак=null;closeSheet()">Закрыть</button>`,
     `<button class="btn soft" onclick="копироватьЗаказ()">Скопировать</button>`]);
}
function перерисоватьЗаказ(){
  const тело=document.getElementById('sheetBody'), y=тело?тело.scrollTop:0;
  orderSheet(); if(тело) тело.scrollTop=y;
}
function кол(id, d){ _зак.кол[id]=Math.max(1, (_зак.кол[id]||1)+d); перерисоватьЗаказ(); }
function _выбранные(g){ return g.позиции.filter(x=>_зак.выбор[x.m.id]).map(x=>({m:x.m, кол:_зак.кол[x.m.id]})); }
function _скопировать(t, ок){
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(()=>ок&&toast(ок),()=>fallbackCopy(t));
  fallbackCopy(t);
}
function отправитьЗаказ(gi){
  const g=группыЗаказа(DB.materials, DB.поставщики)[gi]; if(!g || !g.поставщик) return;
  const строки=_выбранные(g); if(!строки.length) return toast('Отметь, что заказать');
  const p=g.поставщик, текст=текстЗаказа(строки, p.подпись);
  // Текст — ещё и в буфер: если мессенджер не подставит его сам, останется вставить
  _скопировать(текст);
  const url=ссылкаЗаказа(p, текст);
  if(url){ toast('Открываю '+(КАНАЛЫ[p.канал]||'чат')+' — заказ уже набран'); setTimeout(()=>{ location.href=url; }, 350); return; }
  if(p.канал!=='share') return toast('У поставщика не указан контакт — открой его в Настройках');
  if(navigator.share) navigator.share({text:текст}).catch(()=>{});
  else toast('Заказ скопирован');
}
function копироватьЗаказ(){
  const группы=группыЗаказа(DB.materials, DB.поставщики);
  const части=группы.map(g=>{ const с=_выбранные(g); return с.length ? (g.поставщик?g.поставщик.название:g.бренд)+':\n'+с.map(s=>`• ${позицияЗаказа(s.m)} — ${s.кол} уп.`).join('\n') : ''; }).filter(Boolean);
  if(!части.length) return toast('Отметь, что заказать');
  _скопировать(части.join('\n\n'), 'Заказ скопирован');
}

/* ---------- поставщики: шторка-список из Настроек и карточка ---------- */
function поставщикиSheet(){
  const пп=DB.поставщики||[];
  openSheet('Поставщики', `${пп.map(p=>`<div class="card tap" onclick="поставщикSheet('${p.id}',null,'список')"><div class="row between">
      <div class="grow"><div class="title ell">${esc(p.название)}</div>
        <div class="sm muted ell">${esc(КАНАЛЫ[p.канал]||'')} · ${(p.бренды||[]).length?esc(p.бренды.join(', ')):'бренды не выбраны'}</div></div>
      <span class="chev">›</span></div></div>`).join('')}
    <button class="btn soft" onclick="поставщикSheet(null,null,'список')">＋ Добавить поставщика</button>`,
    [`<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`]);
}
// куда вернуться из карточки поставщика: в заказ, в список поставщиков или просто закрыть
function _назадИзПоставщика(н){
  if(н==='заказ'){ _зак=null; orderSheet(); return; }
  if(TAB==='settings') go('settings',true);
  if(н==='список') поставщикиSheet(); else closeSheet();
}
let _пост=null, _постНазад=null;
function поставщикSheet(id, бренд, назад){
  if(id!==undefined || бренд!==undefined || !_пост){
    const p=id ? (DB.поставщики||[]).find(x=>x.id===id) : null;
    const подпись=((DB.поставщики||[]).find(x=>x.подпись)||{}).подпись||'';
    _пост = p ? JSON.parse(JSON.stringify(p))
      : {id:null, название:бренд||'', бренды:бренд?[бренд]:[], канал:'tg', контакт:'', подпись};
    _постНазад=назад||null;
  }
  // бренды склада без повторов: «Ollin» и «OLLIN» — один бренд, записанный по-разному
  const все=[];
  [..._пост.бренды, ...DB.materials.map(m=>(m.бренд||'').trim())].forEach(b=>{
    if(b && b!=='—' && !все.some(x=>_бренд(x)===_бренд(b))) все.push(b); });
  все.sort((a,b)=>a.localeCompare(b,'ru'));
  const чей=b=>(DB.поставщики||[]).find(p=>p.id!==_пост.id && (p.бренды||[]).some(x=>_бренд(x)===_бренд(b)));
  const к=_пост.канал;
  const полеКонтакта={tg:['Ник или телефон в Telegram','@manager'], wa:['Телефон WhatsApp','+7 900 000-00-00'], mail:['Почта','zakaz@example.ru']}[к];
  openSheet(_пост.id?'Поставщик':'Новый поставщик', `
    <label class="fld"><span>Название</span><input id="ps_name" value="${esc(_пост.название)}" placeholder="Helen Seward · дистрибьютор"></label>
    <label class="fld" style="margin-bottom:8px"><span>Какие бренды у него заказываю</span></label>
    <div class="bchips" style="margin-bottom:14px">${все.map(b=>{ const on=_пост.бренды.some(x=>_бренд(x)===_бренд(b)), другой=!on&&чей(b);
      return `<button class="${on?'on':''}" onclick="брендПоставщика(${esc(JSON.stringify(b))})">${esc(b)}${другой?'<small> · у другого</small>':''}</button>`; }).join('')
      || '<span class="sm muted">На складе пока нет брендов</span>'}</div>
    <label class="fld" style="margin-bottom:8px"><span>Куда отправлять заказ</span></label>
    <div class="seg2" style="margin-bottom:14px">${Object.keys(КАНАЛЫ).map(x=>`<button class="${x===к?'on':''}" onclick="каналПоставщика('${x}')">${КАНАЛЫ[x]}</button>`).join('')}</div>
    ${полеКонтакта?`<label class="fld"><span>${полеКонтакта[0]}</span><input id="ps_contact" value="${esc(_пост.контакт)}" placeholder="${полеКонтакта[1]}" ${к==='mail'?'type="email" inputmode="email"':к==='wa'?'type="tel" inputmode="tel"':'autocapitalize="off"'} autocomplete="off"></label>`
      :''}
    <label class="fld"><span>Подпись в конце заказа</span><input id="ps_sign" value="${esc(_пост.подпись)}" placeholder="Варя, колорист"></label>`,
    [_пост.id?`<button class="btn danger wauto" onclick="удалитьПоставщика()" aria-label="Удалить">🗑</button>`
             :`<button class="btn ghost" onclick="закрытьПоставщика()">Отмена</button>`,
     `<button class="btn" onclick="сохранитьПоставщика()">Сохранить</button>`]);
}
// Поля ввода переживают перерисовку карточки (выбор бренда, канала): забираем их в черновик
function _полеВЧерновик(){
  const v=id=>{ const e=document.getElementById(id); return e?e.value:null; };
  if(v('ps_name')!=null) _пост.название=v('ps_name');
  if(v('ps_contact')!=null) _пост.контакт=v('ps_contact');
  if(v('ps_sign')!=null) _пост.подпись=v('ps_sign');
}
function брендПоставщика(b){
  _полеВЧерновик();
  const есть=_пост.бренды.some(x=>_бренд(x)===_бренд(b));
  _пост.бренды = есть ? _пост.бренды.filter(x=>_бренд(x)!==_бренд(b)) : [..._пост.бренды, b];
  поставщикSheet();
}
function каналПоставщика(к){ _полеВЧерновик(); if(_пост.канал!==к){ _пост.канал=к; _пост.контакт=''; } поставщикSheet(); }
function закрытьПоставщика(){ const н=_постНазад; _пост=null; _постНазад=null; if(н==='заказ') orderSheet(); else if(н==='список') поставщикиSheet(); else closeSheet(); }
function сохранитьПоставщика(){
  _полеВЧерновик();
  const p=_пост;
  p.название=(p.название||'').trim() || p.бренды.join(', ');
  p.контакт=(p.контакт||'').trim(); p.подпись=(p.подпись||'').trim();
  if(!p.название) return toast('Введи название поставщика');
  if(p.канал!=='share' && !p.контакт) return toast('Укажи, куда отправлять: '+({tg:'ник или телефон',wa:'телефон',mail:'почту'}[p.канал]));
  if(p.канал==='mail' && !/@/.test(p.контакт)) return toast('Похоже, это не почта');
  if(!DB.поставщики) DB.поставщики=[];
  // бренд — у одного поставщика: выбранные здесь снимаем у остальных
  DB.поставщики.forEach(o=>{ if(o.id!==p.id) o.бренды=(o.бренды||[]).filter(b=>!p.бренды.some(x=>_бренд(x)===_бренд(b))); });
  if(p.id){ const i=DB.поставщики.findIndex(x=>x.id===p.id); if(i>=0) DB.поставщики[i]=p; }
  else { p.id=uid('sp'); DB.поставщики.push(p); }
  save(); toast('Поставщик сохранён');
  const н=_постНазад; _пост=null; _постНазад=null;
  _назадИзПоставщика(н);
}
function удалитьПоставщика(){
  const id=_пост&&_пост.id; if(!id) return;
  confirmDo('Удалить поставщика? Позиции его брендов в «Заказать» останутся — без кнопки отправки.', ()=>{
    DB.поставщики=(DB.поставщики||[]).filter(p=>p.id!==id);
    const н=_постНазад; save(); _пост=null; _постНазад=null; _назадИзПоставщика(н); toast('Поставщик удалён');
  });
}
