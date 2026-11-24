/* ==================== ЦЕХ «СИНХРОНИЗАЦИЯ И КОПИИ» ====================
   Обмен всей базой с сервером (PUT/GET /data, ключ X-Key) со слиянием по записям,
   и резервные копии файлом. Подробно: docs/workshops/sync.md */

/* ==================== СЛИЯНИЕ ====================
   Раньше побеждала база с более свежим _updatedAt — целиком. Планшет со старыми данными,
   поправленный без сети, затирал всё, что внесли с телефона. Теперь трёхстороннее слияние:
   base — последняя версия, о которой договорились с сервером; сравнивая с ней, видно,
   кто что менял. Менял один — берём его. Менялись оба — сливаем по id, поле за полем. */
const SYNC_LISTS=['materials','pieces','services','works','purchases','expenses','equipment','нормы','поставщики'];
// Остатки меняются с обеих сторон одновременно (тут списали, там пришло) — складываем разницу.
const SYNC_COUNTERS=['остаток_г','остаток_шт'];
const _same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/* Одна запись. Без общей версии (обе стороны впервые) решает, чья база свежее. */
function слитьЗапись(b, l, r, нашаСвежее){
  if(!b) return нашаСвежее ? l : r;
  const out={};
  new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]).forEach(k=>{
    const мы=!_same(l[k],b[k]), они=!_same(r[k],b[k]);
    let v = они && !мы ? r[k] : l[k];
    if(мы && они && SYNC_COUNTERS.includes(k) && typeof b[k]==='number')
      v = Math.max(0, Math.round(((+l[k]||0)+(+r[k]||0)-b[k])*10)/10);
    if(v!==undefined) out[k]=v;
  });
  return out;
}
/* Список записей по id. Удалили с одной стороны, а с другой запись не трогали — удаляем;
   если с другой её успели поправить — правка важнее, запись остаётся. */
function слитьСписок(bl, ll, rl, нашаСвежее){
  const byId=a=>new Map((a||[]).filter(x=>x&&x.id!=null).map(x=>[x.id,x]));
  const B=byId(bl), L=byId(ll), R=byId(rl), out=[];
  (ll||[]).forEach(l=>{
    if(!l || l.id==null) return out.push(l);
    const r=R.get(l.id), b=B.get(l.id);
    if(r) out.push(слитьЗапись(b, l, r, нашаСвежее));
    else if(!b || !_same(l,b)) out.push(l);          // новая у нас или правили у нас
  });
  (rl||[]).forEach(r=>{
    if(!r || r.id==null || L.has(r.id)) return;
    const b=B.get(r.id);
    if(!b || !_same(r,b)) out.push(r);               // новая там или правили там
  });
  return out;
}
function слитьБазы(base, local, remote){
  const нашаСвежее=(+local._updatedAt||0) >= (+remote._updatedAt||0);
  const без=o=>{ const x={...o}; SYNC_LISTS.forEach(k=>delete x[k]); return x; };
  const out=слитьЗапись(base?без(base):null, без(local), без(remote), нашаСвежее);
  SYNC_LISTS.forEach(k=>{
    if(local[k]||remote[k]) out[k]=слитьСписок(base&&base[k], local[k], remote[k], нашаСвежее);
  });
  return out;
}

/* ==================== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ==================== */
const SYNC_KEY='colorist_sync';
const SYNC_BASE_KEY='colorist_sync_base';   // общая версия для слияния, см. выше
function syncCfg(){ try{ return JSON.parse(localStorage.getItem(SYNC_KEY))||null; }catch(e){ return null; } }
function syncBase(){ try{ return JSON.parse(localStorage.getItem(SYNC_BASE_KEY))||null; }catch(e){ return null; } }
let _syncT=null, _sync={at:+localStorage.getItem('colorist_sync_at')||0, err:null, busy:false};
/* Восстановление из копии и сброс — осознанная замена: следующий обмен заливает базу как есть.
   Флаг в localStorage — чтобы пережить закрытие приложения до обмена. Без подключённого
   сервера не ставим: подключение и так берёт данные сервера, а забытый флаг потом затёр бы его. */
const SYNC_FORCE_KEY='colorist_sync_force';
function syncReplaceNext(){ const c=syncCfg(); if(c&&c.url) localStorage.setItem(SYNC_FORCE_KEY,'1'); }
function syncUrl(c){ return c.url.replace(/\/+$/,'')+'/data'; }
function scheduleSync(){ const c=syncCfg(); if(!c||!c.url) return; clearTimeout(_syncT); _syncT=setTimeout(pushSync, 2000); }
/* Запоминаем то, что теперь лежит на сервере (строкой — снятой ДО ожидания ответа:
   пока шёл запрос, DB могли успеть поправить, это уже следующий обмен). */
function markSynced(json){
  try{ localStorage.setItem(SYNC_BASE_KEY, json); }catch(e){}
  _sync.at=Date.now(); _sync.err=null;
  localStorage.setItem('colorist_sync_at', String(_sync.at));
  localStorage.setItem(BK_KEY, String(_sync.at)); // серверная копия = резервная копия
}
/* Обмены идут строго по одному: два параллельных перетёрли бы друг друга. */
let _syncRun=Promise.resolve();
function pushSync(){ _syncRun=_syncRun.then(syncNow, syncNow); return _syncRun; }
const pullSync=pushSync;   // при старте — тот же обмен: сам решит, тянуть, слать или сливать
async function syncNow(){
  const c=syncCfg(); if(!c||!c.url) return false;
  _sync.busy=true;
  try{
    const h={'X-Key':c.key||''};
    const r=await fetch(syncUrl(c), {headers:h, cache:'no-store'});
    if(r.status===401) throw new Error('неверный ключ');
    let remote=null;
    if(r.status!==404){                                // 404 — на сервере пусто
      if(!r.ok) throw new Error('HTTP '+r.status);
      remote=await r.json();
      if(!remote || !remote.db) remote=null;
    }
    const base=syncBase();
    const rAt=remote ? (+remote.updatedAt||+remote.db._updatedAt||0) : 0;
    const мы = !base || (+DB._updatedAt||0)!==(+base._updatedAt||0);
    const они = !!remote && (!base || rAt!==(+base._updatedAt||0));
    const put=async()=>{
      const json=JSON.stringify(DB);
      const p=await fetch(syncUrl(c), {method:'PUT', headers:{...h,'Content-Type':'application/json'},
        body:JSON.stringify({updatedAt:DB._updatedAt||Date.now(), db:DB})});
      if(!p.ok) throw new Error('HTTP '+p.status);
      markSynced(json);
    };
    if(localStorage.getItem(SYNC_FORCE_KEY) || !remote){ await put(); localStorage.removeItem(SYNC_FORCE_KEY); return true; }
    if(remote && rAt===(+DB._updatedAt||0)){ markSynced(JSON.stringify(remote.db)); return true; }  // уже одно и то же
    if(!они){ if(мы) await put(); else markSynced(JSON.stringify(remote.db)); return true; }
    if(!мы){                                            // менялось только там — просто берём
      DB=remote.db; мигрируй();
      localStorage.setItem(KEY, JSON.stringify(DB));
      markSynced(JSON.stringify(remote.db));
      go(TAB); toast('Данные обновлены с сервера ✓');
      return true;
    }
    DB=слитьБазы(base, DB, remote.db); мигрируй();      // менялись обе стороны
    DB._updatedAt=Date.now(); localStorage.setItem(KEY, JSON.stringify(DB));
    await put();
    go(TAB); toast('Объединено с изменениями с другого устройства ✓');
    return true;
  }catch(e){ _sync.err=(e&&e.message)||'нет связи'; return false; }
  finally{ _sync.busy=false; if(TAB==='settings') go('settings'); }
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
  localStorage.removeItem(SYNC_FORCE_KEY); localStorage.removeItem(SYNC_BASE_KEY);   // новое подключение — с чистого листа
  // При подключении сервер — источник истины: если там есть данные, берём их
  // (иначе свежеустановленное приложение затёрло бы учёт своей пустой базой).
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
    markSynced(JSON.stringify(remote.db));
    go('settings'); toast('Подключено, данные загружены с сервера ✓');
  }catch(e){
    _sync.err=(e&&e.message)||'нет связи';
    go('settings'); toast('Не удалось: '+_sync.err);
  }
}
function disconnectSync(){
  confirmDo('Отключить синхронизацию с сервером? Данные на сервере останутся, но обновляться перестанут.', ()=>{
    [SYNC_KEY, SYNC_BASE_KEY, SYNC_FORCE_KEY].forEach(k=>localStorage.removeItem(k)); go('settings'); toast('Синхронизация отключена'); }, 'Отключить');
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
      syncReplaceNext();   // копия заменяет базу и на сервере, а не сливается с ней
      save(); markBackedUp(); go('stock'); toast('Данные восстановлены ✓');
    }, 'Восстановить');
  };
  r.readAsText(f);
}
