/* Проверка вёрстки в браузере (не node --test): Playwright MCP → browser_run_code_unsafe
   с filename = <проект>/tests/ui/layout-check.js. Перед запуском в корне проекта — сервер с длинной
   очередью (обычный http.server держит 5 соединений, на Windows часть из 13 скриптов отбивается):
     python -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size=64; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8793, bind='127.0.0.1')"
   открыть http://127.0.0.1:8793/ и загрузить копию её данных (⚙️ → «Восстановить из копии»).
   Ловит: текст вылезает/обрезан/налезает, плашки вплотную, кнопки в ряд разной высоты,
   сообщение не закрывает шапку — на всех экранах и шторках, ширины 375/390/430.
   Ответ «НАРУШЕНИЙ НЕТ» или список. Некоторые шторки ищут материалы с её данных («шаг 1»). */
async (page) => {
  // Проверка вёрстки: текст вылезает из рамки, обрезан без многоточия, налезает на соседний текст;
  // плашки в строках карточек налезают друг на друга; сообщение закрывает шапку целиком.
  // Все экраны (с прокруткой) и все шторки, на ширине iPhone 375 / 390 / 430.
  // браузер любит держать старые файлы: каждый запрос — с проверкой свежести
  await page.unroute('**/*').catch(() => {});
  await page.route('**/*', route => route.continue({ headers: { ...route.request().headers(), 'cache-control': 'no-cache', pragma: 'no-cache' } }));
  await page.reload(); await page.waitForTimeout(900);
  if (await page.evaluate(() => typeof выборМатериала) !== 'function') return 'СТАРЫЕ ФАЙЛЫ — проверка не запускалась';
  const check = () => page.evaluate(() => {
    const out = [];
    const BOX = '.glass,.card,.dark,.pill,.chip,.stat,.step-card,.tab,.fchip,.btn,.cta,.day,.mat,.item,.sheet,.search,.field,.badge,.confirm,.toast,.round,.xbtn,.iconbtn';
    const vis = el => { let r = el.getBoundingClientRect(); let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
      for (let p = el.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p);
        if (/(auto|hidden|scroll)/.test(cs.overflow + cs.overflowY + cs.overflowX)) { const b = p.getBoundingClientRect();
          x0 = Math.max(x0, b.left); y0 = Math.max(y0, b.top); x1 = Math.min(x1, b.right); y1 = Math.min(y1, b.bottom); } }
      return { left: x0, top: y0, right: x1, bottom: y1, ok: x1 - x0 > 1 && y1 - y0 > 1 }; };
    const leaf = [...document.querySelectorAll('#phone *')].filter(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (el.closest('.sheet-bg:not(.open), .radial:not(.open), .confirm-bg:not(.open), .toast:not(.show)')) return false;
      return [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(el).ok;
    });
    const name = el => '«' + [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').slice(0, 26) + '»';
    for (const el of leaf) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') out.push('обрезан ' + name(el));
      const own = el.parentElement && el.parentElement.closest(BOX);
      if (own) { const b = own.getBoundingClientRect();
        if (r.left < b.left - 1 || r.right > b.right + 1) out.push('вылезает ' + name(el) + ' из .' + own.className.split(' ')[0]); }
      if (el.matches(BOX) && el.scrollWidth > el.clientWidth + 1) out.push('шире плашки ' + name(el));
    }
    // таб-бар и висящие кнопки склада (.dock) — свои слои: список проходит под ними нарочно
    const layer = e => e.closest('#tabbar') ? 1 : e.closest('.dock') ? 6 : e.closest('#sheetBg') ? 2 : e.closest('#radial') ? 3 : e.closest('#toast') ? 4 : e.closest('#confirmBg') ? 5 : 0;
    const textRect = el => { const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); const v = vis(el);
      return { left: Math.max(r.left, v.left), top: Math.max(r.top, v.top), right: Math.min(r.right, v.right), bottom: Math.min(r.bottom, v.bottom) }; };
    for (let i = 0; i < leaf.length; i++) for (let j = i + 1; j < leaf.length; j++) {
      const a = leaf[i], b = leaf[j]; if (a.contains(b) || b.contains(a) || layer(a) !== layer(b)) continue;
      const ra = textRect(a), rb = textRect(b);
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 2 && iy > 2) out.push('наложение ' + name(a) + ' × ' + name(b));
    }
    document.querySelectorAll('.mat .row, .work .head, .svc .row, .cap, .hello, .gauge, .top, .item, .bar .l, .kv').forEach(row => {
      const kids = [...row.querySelectorAll(':scope > *, .val > div')].filter(k => k.getBoundingClientRect().width > 0 && !k.matches('svg'));
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        if (kids[i].contains(kids[j]) || kids[j].contains(kids[i])) continue;
        const ra = kids[i].matches('.val, .val > div') ? textRect(kids[i]) : kids[i].getBoundingClientRect();
        const rb = kids[j].matches('.val, .val > div') ? textRect(kids[j]) : kids[j].getBoundingClientRect();
        if (Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 1 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 1)
          out.push('налезают ' + (kids[i].className || kids[i].tagName) + ' × ' + (kids[j].className || kids[j].tagName) + ' в .' + row.className.split(' ')[0]);
      }
      const b = row.getBoundingClientRect();
      [...row.children].forEach(k => { const r = k.getBoundingClientRect(); if (r.width && r.right > b.right + 1) out.push('за край .' + row.className.split(' ')[0] + ': ' + (k.className || k.tagName)); });
    });
    // плашки (фон или рамка), стоящие вплотную или налезающие на соседнюю плашку: зазор меньше 4 px
    const плашка = el => {
      if (el.closest('.bg, svg, .ticks, .levels, .tscale, .months, .bar, .grab')) return false;
      const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 20) return false;
      if (!vis(el).ok) return false;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const a = (cs.backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 0]); const alpha = a.length > 3 ? +a[3] : 1;
      return alpha > 0.02 || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
    };
    const именем = el => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : el.tagName.toLowerCase()) + ' «' + (el.textContent || '').trim().slice(0, 22) + '»';
    document.querySelectorAll('#phone *').forEach(p => {
      const kids = [...p.children].filter(плашка);
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i].getBoundingClientRect(), b = kids[i + 1].getBoundingClientRect();
        const dx = Math.max(b.left - a.right, a.left - b.right), dy = Math.max(b.top - a.bottom, a.top - b.bottom);
        const зазор = Math.max(dx, dy);
        if (зазор < 4) out.push(`вплотную (${Math.round(зазор)} px): ${именем(kids[i])} / ${именем(kids[i + 1])}`);
      }
    });
    // кнопки в одном ряду — одной высоты
    document.querySelectorAll('#phone *').forEach(p => {
      const cs = getComputedStyle(p); if (cs.display !== 'flex' && cs.display !== 'grid') return;
      const btns = [...p.children].filter(k => k.matches('.btn, .cta') && k.getBoundingClientRect().width > 0 && vis(k).ok);
      for (let i = 0; i < btns.length - 1; i++) {
        const a = btns[i].getBoundingClientRect(), b = btns[i + 1].getBoundingClientRect();
        if (Math.abs(a.top - b.top) < a.height && Math.abs(a.height - b.height) > 2)
          out.push(`кнопки разной высоты: «${btns[i].textContent.trim().slice(0, 18)}» ${Math.round(a.height)} / «${btns[i + 1].textContent.trim().slice(0, 18)}» ${Math.round(b.height)}`);
      }
    });
    return [...new Set(out)];
  });
  const res = {};
  for (const W of [375, 390, 430]) {
    await page.setViewportSize({ width: W, height: 844 });
    for (const tab of ['stock', 'services', 'works', 'expenses', 'report', 'settings']) {
      await page.evaluate(t => { closeSheet(); закрытьМеню(); _кат = 'все'; go(t); }, tab);
      await page.waitForTimeout(450);
      for (let k = 0; k < 14; k++) {
        (await check()).forEach(x => (res[W + ' ' + tab] = res[W + ' ' + tab] || new Set()).add(x));
        const more = await page.evaluate(() => { const s = document.getElementById('screen'); const y = s.scrollTop; s.scrollTop += 600; return s.scrollTop > y; });
        if (!more) break; await page.waitForTimeout(120);
      }
    }
    const sheets = {
      material: "matSheet(sortMats(DB.materials)[0].id)",
      materialLong: "matSheet(DB.materials.find(m=>m.нетто_г>=1000).id)",
      newWork: "newWork(); document.getElementById('nw_formula').value='6.2 (30гр) + 6.1 (15гр) + 1,5% (68гр) + 12.11 (5гр)'; parseFormula()",
      incoming: "incomingSheet()",
      incomingParsed: "_inc=null; incomingSheet(); document.getElementById('inc_text').value='Кислотная смывка шаг 1 1 шт 1500\\nLumia 7.34 2 шт 1784\\nОксид 6% 1 уп 450\\n9.99 1 шт 800'; _inc.text=document.getElementById('inc_text').value; incParse()",
      newWorkLong: "newWork(); document.getElementById('nw_formula').value='Кислотная смывка шаг 1 (30гр) + пигмент синий (2гр)'; parseFormula(); _nw.lines.forEach((l,i)=>{ if(!l.материал_id){ l.материал_id=DB.materials.find(m=>/шаг 1/.test(m.название)).id; } }); drawNewWork()",
      editMaterial: "editMaterial(DB.materials[0].id)", service: "svcSheet(DB.services[1].id)",
      editService: "editService(DB.services[1].id)", work: "workSheet(DB.works[DB.works.length-1].id)", expense: "editExpense()",
      norms: "нормыSheet()", equipment: "equipSheet()", order: "открытьЗаказ()", menu: "открытьМеню()",
      orderMarked: "открытьЗаказ(); Object.keys(_зак.выбор).forEach(k=>{_зак.выбор[k]=true;_зак.кол[k]=12;}); перерисоватьЗаказ()",
      supplierNew: "поставщикSheet(null,'Schwarzkopf','заказ')",
      supplierWa: "поставщикSheet(); каналПоставщика('wa')",
      supplierShare: "поставщикSheet(); каналПоставщика('share')",
      supplierEdit: "поставщикSheet((DB.поставщики[0]||{}).id)",
      suppliers: "поставщикиSheet()", backup: "копияSheet()", serverConnect: "серверSheet()",
      server: "localStorage.setItem('colorist_sync', JSON.stringify({url:'https://sync.invalid', key:'x'})); серверSheet(); localStorage.removeItem('colorist_sync')",
      confirm: "confirmDo('Удалить ВСЕ данные учёта? На сервере они тоже будут стёрты. Отменить нельзя — только восстановить из копии.', ()=>{}, 'Удалить всё')",
    };
    for (const [k, js] of Object.entries(sheets)) {
      await page.evaluate(`closeSheet(); closeConfirm(); закрытьМеню(); go('stock'); ${js}`);
      await page.waitForTimeout(650);
      for (let s = 0; s < 10; s++) {
        (await check()).forEach(x => (res[W + ' шторка ' + k] = res[W + ' шторка ' + k] || new Set()).add(x));
        const more = await page.evaluate(() => { const s = document.getElementById('sheetBody'); const y = s.scrollTop; s.scrollTop += 400; return s.scrollTop > y; });
        if (!more) break; await page.waitForTimeout(120);
      }
    }
    await page.evaluate(() => closeConfirm());
  }
  // сообщение поверх шапки — в отдельном окне без подмены даты (с ней анимации замирают)
  const ctx2 = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage(); await p2.goto(page.url()); await p2.waitForTimeout(800);
  for (const W of [375, 390, 430]) {
    await p2.setViewportSize({ width: W, height: 844 });
    await p2.evaluate(() => { closeSheet(); go('works'); }); await p2.waitForTimeout(800);
    await p2.evaluate(() => toast('Формула распознана, уточните 2 строки')); await p2.waitForTimeout(500);
    const t = await p2.evaluate(() => { const a = document.getElementById('toast').getBoundingClientRect(), b = document.querySelector('.top').getBoundingClientRect();
      return { covers: a.top <= b.top && a.bottom >= b.bottom && a.left <= b.left + 4 && a.right >= b.right - 4, a: [a.top, a.bottom], b: [b.top, b.bottom] }; });
    if (!t.covers) res[W + ' сообщение'] = new Set(['не закрывает шапку: ' + JSON.stringify(t)]);
  }
  await ctx2.close();
  await page.evaluate(() => { closeSheet(); закрытьМеню(); });
  await page.setViewportSize({ width: 390, height: 844 });
  const o = {}; for (const k in res) if (res[k].size) o[k] = [...res[k]];
  return Object.keys(o).length ? JSON.stringify(o, null, 1) : 'НАРУШЕНИЙ НЕТ';
}
