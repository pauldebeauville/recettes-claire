import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { lien } from '../lib/recettes';

// Service worker : le carnet reste consultable sans connexion (en cuisine, à la cave…).
export const GET: APIRoute = async () => {
  const pages = [lien(), lien('courses/'), lien('repas/'), ...(await getCollection('recettes')).map((r) => lien(`recettes/${r.id}/`))];
  const version = `carnet-${Date.now()}`;
  const code = `
const VERSION = ${JSON.stringify(version)};
const PAGES = ${JSON.stringify(pages)};

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // l'accueil d'abord, puis toutes les recettes en arrière-plan
  e.waitUntil(caches.open(VERSION).then((c) => c.add(PAGES[0]).then(() => { c.addAll(PAGES.slice(1)).catch(() => {}); })));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // pages : le réseau d'abord pour avoir la dernière version, le cache sinon
    e.respondWith(
      fetch(req)
        .then((r) => { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); return r; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(PAGES[0]))),
    );
    return;
  }
  // styles, scripts, polices : le cache d'abord
  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((rep) => {
      if (rep.ok) { const copie = rep.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
      return rep;
    })),
  );
});
`;
  return new Response(code, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
