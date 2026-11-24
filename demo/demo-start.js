/* ==================== ДЕМО: ХРАНИЛИЩЕ ====================
   Только для демо-сборки (demo/build.js), в рабочее приложение не попадает.
   Подключается ПЕРВЫМ: сборка заменяет в коде цехов localStorage на ДЕМО_LS.
   Зачем: демо может оказаться на том же адресе, что и рабочее приложение, — тогда оно
   затёрло бы живую базу colorist_v7. С префиксом ключи демо живут отдельно.
   Хранилище бывает закрыто (приватный режим, встроенный просмотр) — тогда данные
   держим в памяти до перезагрузки, приложение при этом работает. */
const ДЕМО_ПРЕФИКС='colorist_demo:';
const ДЕМО_LS=(()=>{
  const mem={};
  let real=null;
  try{ real=window.localStorage; real.setItem(ДЕМО_ПРЕФИКС+'t','1'); real.removeItem(ДЕМО_ПРЕФИКС+'t'); }
  catch(e){ real=null; }
  return {
    getItem(k){
      if(real){ try{ return real.getItem(ДЕМО_ПРЕФИКС+k); }catch(e){} }
      return k in mem ? mem[k] : null;
    },
    setItem(k,v){
      v=String(v); mem[k]=v;
      if(real){ try{ real.setItem(ДЕМО_ПРЕФИКС+k, v); }catch(e){} }
    },
    removeItem(k){
      delete mem[k];
      if(real){ try{ real.removeItem(ДЕМО_ПРЕФИКС+k); }catch(e){} }
    },
  };
})();
