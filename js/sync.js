/* ==================== ЦЕХ «СИНХРОНИЗАЦИЯ И КОПИИ» ====================
   Обмен всей базой с сервером (PUT/GET /data, ключ X-Key, побеждает более свежий _updatedAt)
   и резервные копии файлом. Подробно: docs/workshops/sync.md */

/* ==================== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ==================== */
const SYNC_KEY='colorist_sync';
function syncCfg(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY))||null; }catch(e){ return null; } }
let _syncT=null, _sync={at:+localStorage.getItem('colorist_sync_at')||0, err:null, busy:false};
function syncUrl(c){ return c.url.replace(/\/+$/,'')+'/data'; }
function scheduleSync(){ const c=syncCfg(); if(!c||!c.url) return; clearTimeout(_syncT); _syncT=setTimeout(pushSync, 2000); }
async function pushSync(){
  const c=syncCfg(); if(!c||!c.url) return false;
  _sync.busy=true;
  try{
    const r=await fetch(syncUrl(c), {method:'PUT',
      headers:{'Content-Type':'application/json','X-Key':c.key||''},
      body:JSON.stringify({updatedAt:DB._updatedAt||Date.now(), db:DB})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    _sync.at=Date.now(); _sync.err=null;
    localStorage.setItem('colorist_sync_at', String(_sync.at));
    localStorage.setItem(BK_KEY, String(_sync.at)); // серверная копия = резервная копия
    return true;
  }catch(e){ _sync.err=(e&&e.message)||'нет связи'; return false; }
  finally{ _sync.busy=false; if(TAB==='settings') go('settings'); }
}
async function pullSync(){
  const c=syncCfg(); if(!c||!c.url) return false;
  try{
    const r=await fetch(syncUrl(c), {headers:{'X-Key':c.key||''}});
    if(r.status===404){ return pushSync(); }  // на сервере пусто — заливаем своё
    if(!r.ok) throw new Error('HTTP '+r.status);
    const remote=await r.json();
    const rAt=+(remote&&remote.updatedAt)||0, lAt=+DB._updatedAt||0;
    if(remote && remote.db && rAt>lAt){
      DB=remote.db; мигрируй();
      localStorage.setItem(KEY, JSON.stringify(DB));
      go(TAB); toast('Данные обновлены с сервера ✓');
    } else if(lAt>rAt){ pushSync(); }
    _sync.at=Date.now(); _sync.err=null;
    localStorage.setItem('colorist_sync_at', String(_sync.at));
    localStorage.setItem(BK_KEY, String(_sync.at));
    return true;
  }catch(e){ _sync.err=(e&&e.message)||'нет связи'; return false; }
}
function syncStatusText(){
  const c=syncCfg();
  if(!c||!c.url) return 'Сервер не подключён. Данные живут только в этом браузере.';
  let s='Сервер: '+esc(c.url);   // показываем с протоколом — по http с https-страницы браузер режет запрос
  // Страница по https, а адрес сервера по http — браузер блокирует такой запрос («Load failed»).
  const mixed = location.protocol==='https:' && /^http:\/\//i.test(c.url);
  if(mixed) return s+` · <span style="color:var(--red)">адрес по http, а приложение по https — браузер блокирует. Подключитесь заново, указав https://</span>`;
  if(_sync.err) return s+` · <span style="color:var(--red)">ошибка: ${esc(_sync.err)}</span>`;
  if(!_sync.at) return s+' · ещё не синхронизировано';
  const m=Math.floor((Date.now()-_sync.at)/60000);
  return s+' · <span style="color:var(--green)">синх. '+(m<1?'только что':m+' мин назад')+' ✓</span>';
}
async function connectSync(){
  let url=(document.getElementById('sy_url').value||'').trim().replace(/\/+$/,'');
  const key=(document.getElementById('sy_key').value||'').trim();
  if(!url) return toast('Введите адрес сервера');
  if(!/^https?:\/\//i.test(url)) url='https://'+url;             // протокол забыли — ставим сами
  if(location.protocol==='https:' && /^http:\/\//i.test(url))
    url='https://'+url.slice(7);                                  // http с https-страницы браузер заблокирует
  toast('Проверяю связь…');
  // При подключении сервер — источник истины: если там есть данные, берём их
  // (иначе свежеустановленное приложение затёрло бы учёт своим тестовым сидом).
  try{
    const r=await fetch(url+'/data', {headers:{'X-Key':key}});
    if(r.status===401) throw new Error('неверный ключ');
    if(r.status===404){ // сервер пуст — заливаем своё
      localStorage.setItem(SYNC_KEY, JSON.stringify({url,key}));
      const ok=await pushSync();
      if(!ok) throw new Error(_sync.err||'нет связи');
      toast('Подключено, данные сохранены на сервер ✓'); go('settings'); return;
    }
    if(!r.ok) throw new Error('HTTP '+r.status);
    const remote=await r.json();
    if(!remote || !remote.db || !Array.isArray(remote.db.materials)) throw new Error('на сервере не данные учёта');
    localStorage.setItem(SYNC_KEY, JSON.stringify({url,key}));
    DB=remote.db; мигрируй();
    localStorage.setItem(KEY, JSON.stringify(DB));
    _sync.at=Date.now(); _sync.err=null;
    localStorage.setItem('colorist_sync_at', String(_sync.at));
    localStorage.setItem(BK_KEY, String(_sync.at));
    go('settings'); toast('Подключено, данные загружены с сервера ✓');
  }catch(e){
    _sync.err=(e&&e.message)||'нет связи';
    go('settings'); toast('Не удалось: '+_sync.err);
  }
}
function disconnectSync(){
  confirmDo('Отключить синхронизацию с сервером? Данные на сервере останутся, но обновляться перестанут.', ()=>{
    localStorage.removeItem(SYNC_KEY); go('settings'); toast('Синхронизация отключена'); }, 'Отключить');
}
window.addEventListener('online', ()=>{ pushSync(); });

/* ==================== РЕЗЕРВНЫЕ КОПИИ ==================== */
const BK_KEY='colorist_backup_at';
function backupInfoText(){
  const t=localStorage.getItem(BK_KEY);
  if(!t) return '⚠️ Копия ещё ни разу не сохранялась. Данные живут только в этом браузере.';
  const days=Math.floor((Date.now()-+t)/86400000);
  if(days===0) return '✅ Последняя копия — сегодня.';
  if(days<=7) return `Последняя копия — ${days} ${plural(days,'день','дня','дней')} назад.`;
  return `⚠️ Последняя копия — ${days} ${plural(days,'день','дня','дней')} назад. Пора обновить.`;
}
function backupStale(){
  const t=localStorage.getItem(BK_KEY);
  if(!t) return DB.works.length>0;
  return (Date.now()-+t)/86400000 > 7;
}
function backupBlob(){
  const data={...DB, _экспорт:todayISO(), _приложение:'colorist-app'};
  return new Blob([JSON.stringify(data,null,1)], {type:'application/json'});
}
function backupName(){ return 'учёт-колорист-'+todayISO()+'.json'; }
function markBackedUp(){ localStorage.setItem(BK_KEY, String(Date.now())); }
function downloadBackup(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(backupBlob()); a.download=backupName();
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000);
  markBackedUp(); toast('Копия скачана'); go('settings');
}
async function shareBackup(){
  const file=new File([backupBlob()], backupName(), {type:'application/json'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], title:'Резервная копия учёта'});
      markBackedUp(); toast('Копия отправлена'); go('settings'); return; }
    catch(e){ if(e.name==='AbortError') return; }
  }
  downloadBackup(); // на компьютере «поделиться» нет — просто скачиваем
}
function importBackup(input){
  const f=input.files && input.files[0]; input.value='';
  if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    let data=null;
    try{ data=JSON.parse(r.result); }catch(e){}
    if(!data || !Array.isArray(data.materials) || !Array.isArray(data.works))
      return toast('Это не файл копии учёта');
    const n=data.works.length, m=data.materials.length;
    confirmDo(`Восстановить данные из копии${data._экспорт?' от '+data._экспорт:''}? (${m} материалов, ${n} работ). Текущие данные будут заменены.`, ()=>{
      delete data._экспорт; delete data._приложение;
      DB=data; мигрируй();
      save(); markBackedUp(); go('stock'); toast('Данные восстановлены ✓');
    }, 'Восстановить');
  };
  r.readAsText(f);
}
