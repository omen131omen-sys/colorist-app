/* ==================== ЦЕХ «РАСПОЗНАВАНИЕ» ====================
   Текст → строки с материалами: формула из DIKIDI и список покупок (накладная).
   Чистые функции, кроме incFill (читает DB через mById). Подробно: docs/workshops/parser.md */

/* Чистый разбор формулы (без DOM) — используется и в сиде, и в приложении.
   Код оттенка сравнивается ТОЧНО (9.2 ≠ 9.23). Если один код есть в разных
   сериях/брендах (Lumia 6.2 и BB 6.2) — ищем подсказку в тексте («вв», «люмиа»,
   бренд); не нашли — строка помечается неоднозначной с списком кандидатов. */
const _ALIAS={'вв':'bb','бб':'bb','люмиа':'lumia','люмия':'lumia','люми':'lumia','хс':'helen','лонда':'londa','оллин':'ollin','эстель':'estel','эстел':'estel'};
const _ALIAS_V=new Set(Object.values(_ALIAS));
function _matCode(m){ const c=m.название.replace(/(\d),(\d)/g,'$1.$2').match(/(\d{1,2}\.\d{1,2})/); return c?c[1]:null; }
function _matPct(m){ const c=m.название.replace(/(\d),(\d)/g,'$1.$2').match(/(\d+(?:\.\d+)?)\s*%/); return c?c[1]:null; }
const MAX_CAND=8;   // больше вариантов показывать бессмысленно — это уже не подсказка
/* Подбор материала по тексту строки. Общий для формулы и прихода списком.
   used — куски, которые вызывающий уже разобрал сам (граммы, проценты, сумма):
   их выкидываем, чтобы голые цифры не мешали дожимать выбор. */
function matchMaterial(norm, mats, used){
  // слова-подсказки из строки (серия/бренд), с алиасами кириллицы
  const tokens=(norm.match(/[a-zа-яё]{2,}/g)||[])
    .filter(t=>!['гр','мл','шт','уп','упак','руб'].includes(t)).map(t=>_ALIAS[t]||t);
  // Двухбуквенные обрывки («то» из «что-то») находятся внутри половины названий и
  // дают мусорные совпадения. Ищем по словам от трёх букв — кроме алиасов («вв»→bb).
  const ищем=tokens.filter(t=>t.length>=3 || _ALIAS_V.has(t));
  const hay=m=>(m.название+' '+m.бренд).toLowerCase();
  // отбор по словам: побеждают материалы с НАИБОЛЬШИМ числом совпавших слов
  const byTokens=list=>{
    const scored=list.map(m=>({m, n:ищем.filter(t=>hay(m).includes(t)).length})).filter(x=>x.n>0);
    if(!scored.length) return [];
    const max=Math.max(...scored.map(x=>x.n));
    return scored.filter(x=>x.n===max).map(x=>x.m);
  };
  let cand=[];
  const pm=norm.match(/(\d+(?:\.\d+)?)\s*%/);
  if(pm){ cand=mats.filter(m=>m.тип==='оксид' && _matPct(m)===pm[1]); }
  else if(/пудр|блонд|обесцв|порош|осветл/.test(norm)){ cand=mats.filter(m=>m.тип==='пудра'); }
  else if(/бонд|плекс|plex|защит|уход|шампун|кондицион/.test(norm)){ cand=mats.filter(m=>m.тип==='уход'); }
  else {
    // код оттенка — ищем ТОЛЬКО среди красок
    const cm=norm.match(/(\d{1,2}\.\d{1,2})/);
    if(cm) cand=mats.filter(m=>m.тип==='краска' && _matCode(m)===cm[1]);
  }
  // по типу ничего не нашлось («бонд», а уходов на складе нет) — пробуем по словам
  if(!cand.length && ищем.length) cand=byTokens(mats);
  // сужаем по подсказкам («вв 6.2», «лонда 6%», «би хеир»)
  if(cand.length>1 && ищем.length){
    const hit=byTokens(cand);
    if(hit.length>=1) cand=hit;
  }
  // «шаг 1» vs «шаг 2»: голые цифры строки (кроме уже разобранных) дожимают выбор
  if(cand.length>1){
    let rest=norm;
    (used||[]).forEach(s=>{ if(s) rest=rest.replace(s,' '); });
    rest=rest.replace(/\d{1,2}\.\d{1,2}/g,' ');
    const digs=(rest.match(/\d{1,2}/g)||[]);
    if(digs.length){
      const hit=cand.filter(m=>digs.every(d=>new RegExp('(^|[^0-9.,])'+d+'([^0-9.,]|$)').test(m.название.toLowerCase())));
      if(hit.length>=1) cand=hit;
    }
  }
  // Полсклада в «кандидатах» — не подсказка, а шум: родовое слово («краска») цепляет всё.
  // Честнее сказать «не распознано» и дать выбрать из общего списка.
  if(cand.length>MAX_CAND) cand=[];
  return {id:cand.length===1?cand[0].id:null, кандидаты:cand.length>1?cand.map(m=>m.id):null};
}
function parseFormulaText(text, mats){
  const chunks=(text||'').split(/[+\n;]+/).map(s=>s.trim()).filter(Boolean);
  const lines=[];
  chunks.forEach(ch=>{
    const norm=ch.toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
    let grams=null;
    const gm=norm.match(/(\d+(?:\.\d+)?)\s*(?:гр|г|g|мл|ml)(?![а-яёa-z])/i);
    if(gm) grams=parseFloat(gm[1]);
    let bn=null;
    if(grams==null){ bn=norm.match(/(\d+(?:\.\d+)?)\s*$/); if(bn) grams=parseFloat(bn[1]); }
    const pm=norm.match(/(\d+(?:\.\d+)?)\s*%/);
    const r=matchMaterial(norm, mats, [gm&&gm[0], pm&&pm[0], bn&&bn[0]]);
    if(grams!=null || r.id || r.кандидаты){
      lines.push({материал_id:r.id, граммы:grams||0, raw:ch, кандидаты:r.кандидаты});
    }
  });
  return lines;
}
/* ==================== ФОРМУЛА ГОЛОСОМ ====================
   Диктовка (микрофон клавиатуры iPhone или распознавание в браузере) → текст формулы в том виде,
   который понимает parseFormulaText. Диктовка пишет как придётся: «6,2 30 грамм», «шесть два тридцать
   грамм», «62 30 г», «полтора процента девяносто граммов» — всё это должно стать «6.2 30гр + 1.5% 90гр».
   Кусок формулы кончается на «плюс» или на граммах: «…30 грамм 3.0 15 грамм» — это две строки. */
const _ЧИСЛА={ноль:0,нуль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,
  десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,
  восемнадцать:18,девятнадцать:19,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,
  восемьдесят:80,девяносто:90,сто:100,двести:200,триста:300,четыреста:400,пятьсот:500};
function голосВФормулу(text){
  const ДРОБЬ='\u0001';
  let t=(text||'').toLowerCase().replace(/ё/g,'е')
    .replace(/(\d)[.,](\d)/g,'$1'+ДРОБЬ+'$2')            // «6,2» и «6.2» — дробь; точка в конце фразы — нет
    .replace(/[.,;:!?()«»"]/g,' ').replace(new RegExp(ДРОБЬ,'g'),'.')
    .replace(/%/g,' % ').replace(/\+/g,' + ')
    .replace(/(\d)([а-яa-z])/g,'$1 $2').replace(/([а-яa-z])(\d)/g,'$1 $2')
    .replace(/(^|\s)би\s*би(?=\s|$)/g,'$1bb');            // «би би» — серия BB
  // слова → значки
  let т=t.split(/\s+/).filter(Boolean).map(w=>{
    if(/^\d+(\.\d+)?$/.test(w)) return {n:parseFloat(w), s:w};
    if(w==='полтора'||w==='полторы') return {n:1.5, s:'1.5'};
    if(w in _ЧИСЛА) return {n:_ЧИСЛА[w], s:String(_ЧИСЛА[w]), слово:true};
    if(/^(грамм|грамма|граммов|грамов|грам|гр|г|g)$/.test(w)) return {гр:true};
    if(/^(процент|процента|процентов|%)$/.test(w)) return {pct:true};
    if(w==='плюс'||w==='+') return {sep:true};
    if(w==='точка'||w==='запятая') return {dot:true};
    if(w==='и') return {и:true};
    return {w};
  });
  // составные числа словами: «двадцать три» = 23, «сто двадцать пять» = 125; «шесть два» — два числа
  for(let i=0;i<т.length-1;i++){
    const a=т[i], b=т[i+1];
    if(!a.слово || !b.слово) continue;
    const сотни=a.n>=100 && a.n%100===0 && b.n<100;
    const десятки=a.n>=20 && a.n%10===0 && a.n%100!==0 && b.n>=1 && b.n<=9;
    if(сотни||десятки){ т.splice(i,2,{n:a.n+b.n, s:String(a.n+b.n), слово:true}); i--; }
  }
  // «шесть точка два», «шесть и два» → 6.2
  for(let i=1;i<т.length-1;i++){
    const a=т[i-1], b=т[i+1];
    if((т[i].dot||т[i].и) && a.n!=null && b.n!=null && Number.isInteger(a.n) && Number.isInteger(b.n)){
      т.splice(i-1,3,{n:parseFloat(a.s+'.'+b.s), s:a.s+'.'+b.s}); i--;
    }
  }
  // куски: до «плюс» или до граммов включительно
  const куски=[]; let к=[];
  т.forEach(x=>{
    if(x.sep){ if(к.length) куски.push(к); к=[]; return; }
    к.push(x);
    if(x.гр){ куски.push(к); к=[]; }
  });
  if(к.length) куски.push(к);
  return куски.map(к=>{
    const числа=к.map((x,i)=>({...x,i})).filter(x=>x.n!=null);
    const проценты=числа.filter(x=>к[x.i+1]&&к[x.i+1].pct);
    let прочие=числа.filter(x=>!проценты.includes(x));
    // граммы: число перед «грамм»; без единицы — последнее число, если рядом есть код или процент
    let граммы=null;
    const гр=к.findIndex(x=>x.гр);
    if(гр>0 && к[гр-1].n!=null) граммы=числа.find(x=>x.i===гр-1);
    else if(гр<0 && (прочие.length>1 || (проценты.length && прочие.length===1))) граммы=прочие[прочие.length-1];
    прочие=прочие.filter(x=>x!==граммы);
    const слова=к.filter(x=>x.w).map(x=>x.w);
    // «оксид 1,5» без слова «процент» — это всё равно процент
    if(!проценты.length && прочие.length && слова.some(w=>/оксид|окислит|активатор/.test(w)))
      проценты.push(прочие.shift());
    // код оттенка: «6.2»; «6 2» и «шесть два» → 6.2; «десять двенадцать» → 10.12; «62» → 6.2; «шесть ноль один» → 6.01
    let код='';
    if(прочие.length===1){
      const x=прочие[0];
      if(x.s.includes('.')) код=x.s;
      else if(!x.слово && /^\d{2,4}$/.test(x.s)) код=x.s.startsWith('10')&&x.s.length>=3 ? '10.'+x.s.slice(2) : x.s[0]+'.'+x.s.slice(1);
      else код=x.s;
    } else if(прочие.length===2 && Number.isInteger(прочие[0].n) && прочие[0].n<=12 && Number.isInteger(прочие[1].n) && прочие[1].n<100){
      код=прочие[0].n+'.'+прочие[1].s;
    } else if(прочие.length===3 && прочие[1].n===0 && прочие[0].n<=12){
      код=прочие[0].n+'.0'+прочие[2].s;
    } else код=прочие.map(x=>x.s).join(' ');
    return [...слова, код, ...проценты.map(x=>x.s+'%'), граммы?граммы.s+'гр':''].filter(Boolean).join(' ');
  }).filter(Boolean).join(' + ');
}

/* Разбор списка покупок: накладная, сообщение поставщику, свои заметки.
   Строка = позиция. Сами достаём количество упаковок и сумму, остальное — на подбор. */
function parseIncomingText(text, mats){
  return (text||'').split(/[\n;]+/).map(s=>s.trim()).filter(Boolean).map(ch=>{
    const norm=ch.toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
    // сумма: «620 ₽», «620 руб», «— 620» в конце, иначе последнее крупное число строки
    let sm=norm.match(/(\d+(?:\.\d+)?)\s*(?:₽|руб\w*|р\.|р(?![а-яё]))/);
    if(!sm) sm=norm.match(/[=—–-]\s*(\d{3,}(?:\.\d+)?)\s*$/);
    if(!sm) sm=norm.match(/(\d{3,}(?:\.\d+)?)\s*$/);
    // количество упаковок: «2 шт», «2 уп», «х2» (латинская x внутри слова не считается)
    let qm=norm.match(/(\d+(?:\.\d+)?)\s*(?:шт|уп\w*)(?![а-яё])/);
    if(!qm) qm=norm.match(/(?:^|[^a-zа-яё])[хx×*]\s*(\d+(?:\.\d+)?)/);
    const pm=norm.match(/(\d+(?:\.\d+)?)\s*%/);
    const r=matchMaterial(norm, mats, [sm&&sm[0], qm&&qm[0], pm&&pm[0]]);
    return incFill({материал_id:r.id, кандидаты:r.кандидаты, raw:ch, граммы:null,
      уп:qm?parseFloat(qm[1]):null, сумма:sm?parseFloat(sm[1]):null});
  });
}
/* Автоподстановка по понятным позициям: чего в строке не было — достраиваем из
   карточки материала, чтобы сверять глазами, а не набивать руками. */
function incFill(r){
  const m=r.материал_id?mById(r.материал_id):null;
  if(!m) return r;
  if(r.уп==null && r.сумма!=null && m.цена_упаковки>0){
    // сумма делится на цену почти ровно — значит столько упаковок и взяли
    const n=r.сумма/m.цена_упаковки;
    r.уп=(Math.round(n)>=1 && Math.abs(n-Math.round(n))<=0.12) ? Math.round(n) : 1;
  }
  if(r.уп==null) r.уп=1;
  if(r.граммы==null) r.граммы=Math.round(r.уп*m.нетто_г*10)/10;
  if(r.сумма==null) r.сумма=Math.round(r.уп*m.цена_упаковки);
  return r;
}
