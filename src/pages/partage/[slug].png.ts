// Image d'aperçu de chaque recette (WhatsApp, SMS…) : son titre et sa catégorie, aux couleurs du carnet.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { CATEGORIES, TYPES } from '../../lib/libelles';
import { decouperTitre, lirePortions, nbIngredients, typesDe, versionsDe, type Recette } from '../../lib/recettes';

const require = createRequire(import.meta.url);
const police = (fichier: string) => readFileSync(require.resolve(fichier));
const POLICES = [
  { name: 'Fraunces', data: police('@fontsource/fraunces/files/fraunces-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Fraunces', data: police('@fontsource/fraunces/files/fraunces-latin-400-italic.woff'), weight: 400 as const, style: 'italic' as const },
  { name: 'Fraunces', data: police('@fontsource/fraunces/files/fraunces-latin-600-italic.woff'), weight: 600 as const, style: 'italic' as const },
  { name: 'Inter', data: police('@fontsource/inter/files/inter-latin-500-normal.woff'), weight: 500 as const, style: 'normal' as const },
  { name: 'Inter', data: police('@fontsource/inter/files/inter-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
];

// mêmes teintes que le site (thème clair)
const TEINTES: Record<string, string> = {
  apéritif: '#b4741a',
  entrée: '#4f8156',
  plat: '#a8442a',
  accompagnement: '#77742a',
  soupe: '#c0612a',
  sauce: '#6f4e7c',
  dessert: '#a63d62',
  base: '#7a6450',
};

export const getStaticPaths = (async () =>
  (await getCollection('recettes')).map((r) => ({ params: { slug: r.id }, props: { r } }))) satisfies GetStaticPaths;

type Noeud = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, ...children: (Noeud | string)[]): Noeud => ({
  type,
  props: { style, children: children.length === 1 ? children[0] : children },
});

export const GET: APIRoute = async ({ props }) => {
  const r = (props as { r: Recette }).r;
  const d = r.data;
  const teinte = TEINTES[d.categories[0]] ?? '#a8442a';
  const { principal } = decouperTitre(d.titre);
  const taille = principal.length > 70 ? 54 : principal.length > 45 ? 64 : 78;
  const p = lirePortions(versionsDe(d)[0].portions);
  const meta = [
    p.mode === 'personnes' ? `${p.base}${p.max ? `–${p.max}` : ''} ${p.unite}${(p.max ?? p.base) > 1 ? 's' : ''}` : '',
    `${nbIngredients(d)} ingrédients`,
  ]
    .filter(Boolean)
    .join(' · ');

  const arbre = el(
    'div',
    { width: '100%', height: '100%', display: 'flex', background: '#f7f1e7' },
    el('div', { width: 28, height: '100%', background: teinte }),
    el(
      'div',
      { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '72px 84px 64px 76px' },
      el(
        'div',
        { display: 'flex', flexDirection: 'column' },
        el(
          'div',
          { display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 26, letterSpacing: 4, color: teinte, textTransform: 'uppercase' },
          `${d.categories.map((c) => CATEGORIES[c].label).join(' · ')}  ·  ${typesDe(d).map((t) => TYPES[t]).join(' & ')}`,
        ),
        el(
          'div',
          { display: 'flex', marginTop: 26, fontFamily: 'Fraunces', fontWeight: 600, fontSize: taille, lineHeight: 1.08, color: '#2b231d', letterSpacing: -1 },
          principal,
        ),
      ),
      el(
        'div',
        { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' },
        el(
          'div',
          { display: 'flex', fontFamily: 'Fraunces', fontSize: 34, color: '#5c4f45' },
          el('span', { fontWeight: 600, fontStyle: 'normal', marginRight: 9 }, 'Les 1000'),
          el('span', { fontWeight: 400, fontStyle: 'italic', marginRight: 9 }, 'et'),
          el('span', { fontWeight: 600, fontStyle: 'normal', marginRight: 9 }, '1 recettes'),
          el('span', { fontWeight: 400, fontStyle: 'italic', marginRight: 9 }, 'de'),
          el('span', { fontWeight: 600, fontStyle: 'italic', color: '#a8442a' }, 'Claire'),
        ),
        el('div', { display: 'flex', fontFamily: 'Inter', fontWeight: 500, fontSize: 26, color: '#85776a' }, meta),
      ),
    ),
  );

  const svg = await satori(arbre as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: POLICES });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
