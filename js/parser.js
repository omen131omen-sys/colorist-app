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
