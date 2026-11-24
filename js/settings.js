/* ==================== ЦЕХ «НАСТРОЙКИ» ====================
   Экран настроек (группы строк, шторки сервера и копий) и справочник норм расхода.
   Подробно: docs/workshops/settings.md */

function resetData(){
  confirmDo('Удалить ВСЕ данные учёта?'+(syncCfg()?' На сервере они тоже будут стёрты.':'')+' Отменить нельзя — только восстановить из копии.', ()=>{
    DB=seed(); syncReplaceNext(); save(); go('stock'); toast('Все данные удалены'); }, 'Удалить всё');
}

/* ==================== НАСТРОЙКИ ====================
   Как настройки iPhone: три группы строк, справа — значение. Действия — в шторках,
   на экране только то, что нужно увидеть с одного взгляда. */
function строкаНастроек(ик, назв, знач, onclick, cls){
  return `<button class="srow${cls?' '+cls:''}" onclick="${onclick}"><span class="gico">${ИК[ик]}</span>`+
    `<span class="t">${назв}</span>${знач!=null?`<span class="v">${знач}</span>`:''}${cls?'':'<span class="chev">›</span>'}</button>`;
}
function renderSettings(){
  const пп=DB.поставщики||[], нн=(DB.нормы||[]).length;
  return `<div class="sgroup glass">
      ${строкаНастроек('order','Поставщики', пп.length?esc(пп.map(p=>p.название).join(', ')):'нет', 'поставщикиSheet()')}
      ${строкаНастроек('care','Нормы расхода', нн+' '+plural(нн,'строка','строки','строк'), 'нормыSheet()')}
      ${строкаНастроек('mic','Тест голоса', null, "location.href='voice-test.html'")}
    </div>
    <div class="sgroup glass">
      ${строкаНастроек('cloud','Сервер', syncStatusShort(), 'серверSheet()')}
      ${строкаНастроек('archive','Резервная копия', backupShort(), 'копияSheet()')}
    </div>
    <div class="sgroup glass">${строкаНастроек('trash','Удалить все данные', null, 'resetData()', 'danger')}</div>
    <div class="sver" onclick="размерыЭкрана()">Сборка ${APP_BUILD}</div>
    <input id="backupFile" type="file" accept=".json,application/json" style="display:none" onchange="importBackup(this)">`;
}
function серверSheet(){
  const c=syncCfg();
  if(c&&c.url) openSheet('Сервер', `<div class="card">
      <div class="kv"><span class="k">Адрес</span><span class="v">${esc(c.url)}</span></div>
      <div class="kv"><span class="k">Обмен</span><span class="v">${syncStatusShort()}</span></div></div>`,
    [`<button class="btn ghost" onclick="closeSheet();disconnectSync()">Отключить</button>`,
     `<button class="btn" onclick="pushSync().then(ok=>{toast(ok?'Синхронизировано ✓':'Ошибка: '+(_sync.err||'нет связи'));серверSheet();})">Синхронизировать</button>`]);
  else openSheet('Сервер', `
      <label class="fld"><span>Адрес сервера</span><input id="sy_url" placeholder="https://…sslip.io" autocapitalize="off" autocomplete="off"></label>
      <label class="fld"><span>Ключ</span><input id="sy_key" autocapitalize="off" autocomplete="off"></label>`,
    [`<button class="btn ghost" onclick="closeSheet()">Отмена</button>`,
     `<button class="btn" onclick="connectSync().then(()=>{ if(syncCfg()) closeSheet(); })">Подключить</button>`]);
}
function копияSheet(){
  openSheet('Резервная копия', `<div class="card">
      <div class="kv"><span class="k">Последняя</span><span class="v">${backupShort()}</span></div></div>
    <div class="fld-row">
      <button class="btn soft" onclick="closeSheet();shareBackup()">Отправить</button>
      <button class="btn soft" onclick="closeSheet();downloadBackup()">Скачать</button>
    </div>`,
    [`<button class="btn ghost" onclick="closeSheet();document.getElementById('backupFile').click()">Восстановить из копии</button>`]);
}

/* ==================== СПРАВОЧНИК НОРМ ==================== */
function нормыSheet(){
  const rows=(DB.нормы||[]).map(n=>`<div class="card tap" onclick="editНорма('${n.id}')">
    <div class="row between">
      <div class="grow" style="min-width:0">
        <div class="title ell">${esc(n.название)}${n.всем?' <span class="badge" style="padding:1px 7px">во все</span>':''}</div>
        <div class="sm muted ell">${n.ед==='раб'?'фикс. сумма за работу':'цена за '+ЕД[n.ед]}${
          n.накидка?` · +${n.накидка}% погрешность`:''}${n.заметка?' · '+esc(n.заметка):''}</div>
      </div>
      <div class="title mono" style="flex:none;padding-left:8px">${n.ед==='раб'?money(n.цена):money1(n.цена)}</div>
    </div></div>`).join('');
  openSheet('Нормы расхода', `
    ${rows||'<div class="sm muted" style="margin-bottom:8px">Пока пусто.</div>'}
    <button class="btn soft" onclick="editНорма('')">＋ Добавить строку</button>`,
    [`<button class="btn ghost" onclick="closeSheet()">Закрыть</button>`]);
}
function editНорма(id){
  const n = id ? (нById(id)||{}) : {название:'', ед:'г', цена:'', накидка:0, всем:false, заметка:''};
  openSheet(id?'Изменить норму':'Новая норма', `
    <label class="fld"><span>Название</span><input id="nr_name" value="${esc(n.название||'')}" placeholder="Шампунь"></label>
    <div class="fld-row">
      <label class="fld"><span>Единица</span><select id="nr_ed">
        ${Object.keys(ЕД).map(k=>`<option value="${k}" ${n.ед===k?'selected':''}>${ЕД[k]}</option>`).join('')}
      </select></label>
      <label class="fld"><span>Цена, ₽</span><input id="nr_price" type="number" inputmode="decimal" step="0.01" value="${n.цена===''?'':n.цена}" placeholder="1.63"></label>
    </div>
    <label class="fld"><span>Погрешность, %</span><input id="nr_nak" type="number" inputmode="numeric" value="${n.накидка||0}" placeholder="0"></label>
    <label class="fld"><span>Заметка <span class="xs muted">(не обяз.)</span></span>
      <input id="nr_note" value="${esc(n.заметка||'')}" placeholder="что входит в строку"></label>
    <label class="chk" style="margin-bottom:6px">
      <input id="nr_all" type="checkbox" ${n.всем?'checked':''}>
      <span>Во все услуги</span>
    </label>`,
    [ id?`<button class="btn danger wauto" onclick="delНорма('${id}')">🗑</button>`:`<button class="btn ghost" onclick="нормыSheet()">Назад</button>`,
      `<button class="btn" onclick="saveНорма('${id||''}')">Сохранить</button>`]);
}
function saveНорма(id){
  const g=x=>document.getElementById(x).value;
  const name=g('nr_name').trim(); if(!name) return toast('Введите название');
  const obj={ название:name, ед:g('nr_ed'), цена:+g('nr_price')||0, накидка:+g('nr_nak')||0,
              заметка:g('nr_note').trim(), всем:document.getElementById('nr_all').checked };
  if(!DB.нормы) DB.нормы=[];
  if(id){ const i=DB.нормы.findIndex(x=>x.id===id); if(i>=0) DB.нормы[i]={...DB.нормы[i], ...obj}; }
  else DB.нормы.push({id:uid('n'), ...obj});
  save(); нормыSheet(); toast('Сохранено');
}
/* Удаление нормы чистит ссылки в услугах. Работы не трогаем: у них снимок с ценой,
   он и должен пережить справочник — иначе поедет маржа за прошлые месяцы. */
function delНорма(id){
  const исп=(DB.services||[]).filter(s=>(s.нормы||[]).some(x=>x.id===id)).length;
  confirmDo('Удалить строку из справочника?'+(исп?` Она используется в ${исп} ${plural(исп,'услуге','услугах','услугах')} — оттуда тоже уберётся. Проведённые работы не изменятся.`:''), ()=>{
    DB.нормы=(DB.нормы||[]).filter(n=>n.id!==id);
    (DB.services||[]).forEach(s=>{ if(s.нормы) s.нормы=s.нормы.filter(x=>x.id!==id); });
    save(); нормыSheet(); toast('Удалено');
  });
}
