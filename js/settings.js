/* ==================== ЦЕХ «НАСТРОЙКИ» ====================
   Экран настроек (версия, синхронизация, копии, опасная зона) и справочник норм расхода.
   Подробно: docs/workshops/settings.md */

function resetData(){
  confirmDo('Удалить ВСЕ данные учёта?'+(syncCfg()?' На сервере они тоже будут стёрты.':'')+' Отменить нельзя — только восстановить из копии.', ()=>{
    DB=seed(); syncReplaceNext(); save(); go('stock'); toast('Все данные удалены'); }, 'Удалить всё');
}

/* ==================== НАСТРОЙКИ ==================== */
function renderSettings(){
  const sc=syncCfg();
  let h='';
  // Версия сборки — чтобы сразу видеть, долетело ли обновление на телефон.
  h+=`<div class="card" style="margin-bottom:12px"><div class="row between">
      <span class="sm muted">Версия приложения</span>
      <span class="sm mono" style="font-weight:700">${APP_BUILD}</span>
    </div></div>`;
  h+=`<div class="section-title"><span>Синхронизация с сервером</span></div>
    <div class="card">
      <div class="sm" style="margin-bottom:10px">${syncStatusText()}</div>
      ${sc&&sc.url?`
        <div class="fld-row">
          <button class="btn soft" onclick="pushSync().then(ok=>toast(ok?'Синхронизировано ✓':'Ошибка: '+(_sync.err||'нет связи')))">🔄 Синхронизировать</button>
          <button class="btn ghost" onclick="disconnectSync()">Отключить</button>
        </div>`
      :`
        <label class="fld"><span>Адрес сервера</span>
          <input id="sy_url" placeholder="https://1.2.3.4.sslip.io" value=""></label>
        <label class="fld"><span>Секретный ключ</span>
          <input id="sy_key" placeholder="ключ из настройки сервера" value=""></label>
        <button class="btn" onclick="connectSync()">🔗 Подключить</button>`}
    </div>`;

  h+=`<div class="section-title"><span>Нормы расхода</span></div>
    <div class="card tap" onclick="нормыSheet()" style="display:flex;align-items:center;gap:11px">
      <span class="gico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 18.5C5.5 10.5 11.5 5.5 19 5.5c0 7.5-5.5 13-13 13a5 5 0 0 1-.5-.02Z"/><path d="M6 18C9 14.5 12.8 11.6 16.5 9.8"/></svg></span>
      <div class="grow"><div class="title">Уход и мелочь</div>
        <div class="sm muted">${(DB.нормы||[]).length} ${plural((DB.нормы||[]).length,'строка','строки','строк')}</div></div>
      <span style="color:var(--muted)">›</span></div>`;

  h+=`<div class="section-title"><span>Резервная копия</span></div>
    <div class="card">
      <div class="sm muted" style="margin-bottom:10px">${backupInfoText()}</div>
      <div class="fld-row" style="margin-bottom:8px">
        <button class="btn soft" onclick="shareBackup()">📲 Отправить копию</button>
        <button class="btn ghost" onclick="downloadBackup()">⬇️ Скачать</button>
      </div>
      <button class="btn ghost" onclick="document.getElementById('backupFile').click()">📥 Восстановить из копии</button>
      <input id="backupFile" type="file" accept=".json,application/json" style="display:none" onchange="importBackup(this)">
    </div>`;

  h+=`<div class="section-title"><span>Опасная зона</span></div>
    <div class="card">
      <button class="btn danger" onclick="resetData()">🗑 Удалить все данные</button>
    </div>
    <div style="height:12px"></div>`;
  return h;
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
