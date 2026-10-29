import type { APIRoute } from 'astro';
import { lien } from '../lib/recettes';

// Permet d'ajouter le carnet à l'écran d'accueil du téléphone, comme une application.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: 'Les recettes de Claire',
      short_name: 'Recettes Claire',
      description: 'Le carnet de recettes de Claire',
      lang: 'fr',
      start_url: lien(),
      scope: lien(),
      display: 'standalone',
      background_color: '#f7f1e7',
      theme_color: '#f7f1e7',
      icons: [
        { src: lien('icones/icone-192.png'), sizes: '192x192', type: 'image/png' },
        { src: lien('icones/icone-512.png'), sizes: '512x512', type: 'image/png' },
        { src: lien('icones/icone-masquable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
