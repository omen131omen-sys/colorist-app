// Офлайн-кэш: после первого открытия приложение работает без интернета.
// Новый файл в приложении → добавить сюда и поднять номер кэша.
const CACHE = 'colorist-v4';
const JS = ['core','costing','store','parser','stock','services','works','expenses','report','settings','sync','app'];
const ASSETS = ['./', './index.html', './css/app.css', ...JS.map(n => './js/' + n + '.js'),
                './manifest.json', './icon180.png', './icon512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала сеть (чтобы подтягивать обновления), при её отсутствии — кэш.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Сервер синхронизации — другой адрес: его не кэшируем. Иначе вся база оседала в кэше,
  // а без сети на запрос данных отдавался старый ответ или вовсе index.html.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })
      .then(r => r || caches.match('./index.html')))
  );
});
