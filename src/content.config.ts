import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { existsSync } from 'node:fs';
import { CATEGORIES, TYPES, VEDETTES } from './lib/libelles';

const ingredient = z.union([z.string(), z.object({ groupe: z.string() })]);

const etape = z.union([
  z.string(),
  // suite: true quand la numérotation des étapes continue après ce sous-titre (sinon elle repart à 1)
  z.object({ section: z.string(), suite: z.boolean().optional() }),
  z.object({ titre: z.string().optional(), texte: z.array(z.string()) }),
]);

const corps = {
  portions: z.string().optional(),
  temps: z.array(z.object({ label: z.string(), valeur: z.string() })).optional(),
  intro: z.array(z.string()).optional(),
  ingredients: z.array(ingredient).optional(),
  preparation: z.array(etape).optional(),
  notes: z.array(z.object({ titre: z.string().optional(), texte: z.array(z.string()) })).optional(),
  source: z.string().optional(),
};

const type = z.enum(Object.keys(TYPES) as [string, ...string[]]);

const recettes = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/recettes' }),
  schema: z
    .object({
      titre: z.string(),
      type: z.union([type, z.array(type)]),
      categories: z.array(z.enum(Object.keys(CATEGORIES) as [string, ...string[]])).min(1),
      vedettes: z.array(z.enum(Object.keys(VEDETTES) as [string, ...string[]])).optional(),
      ordre: z.number().optional(),
      // photo de famille, déposée dans public/photos/ (ex. : photo: tarte-aux-pommes.jpg)
      photo: z.string().optional(),
      ...corps,
      versions: z.array(z.object({ nom: z.string(), titre: z.string().optional(), ...corps })).optional(),
    })
    .superRefine((r, ctx) => {
      if (r.photo && !existsSync(`public/photos/${r.photo}`)) {
        ctx.addIssue({ code: 'custom', message: `Photo introuvable : déposez « ${r.photo} » dans le dossier public/photos` });
      }
      const parts = r.versions ?? [r];
      parts.forEach((v, i) => {
        const ou = r.versions ? ` (version ${i + 1})` : '';
        if (!v.ingredients?.length) ctx.addIssue({ code: 'custom', message: `Il manque les ingrédients${ou}` });
        if (!v.preparation?.length) ctx.addIssue({ code: 'custom', message: `Il manque la préparation${ou}` });
      });
    }),
});

export const collections = { recettes };
