const C = 'courtside-v22';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/engine.js', 'js/traits.js', 'js/court.js', 'js/crowd.js', 'js/sound.js', 'js/music.js', 'js/faces.js', 'js/game.js', 'js/market.js', 'js/preview.js', 'js/rivals.js', 'js/achieve.js', 'js/model.js', 'js/ui.js', 'icon.svg', 'manifest.webmanifest', 'fonts/barlow-condensed-latin-700-normal.woff2','fonts/barlow-condensed-latin-800-italic.woff2','fonts/barlow-condensed-latin-ext-700-normal.woff2','fonts/barlow-condensed-latin-ext-800-italic.woff2','fonts/barlow-latin-400-normal.woff2','fonts/barlow-latin-600-normal.woff2','fonts/barlow-latin-700-normal.woff2','fonts/barlow-latin-ext-400-normal.woff2','fonts/barlow-latin-ext-600-normal.woff2','fonts/barlow-latin-ext-700-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
