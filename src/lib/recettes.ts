import type { CollectionEntry } from 'astro:content';

export type Recette = CollectionEntry<'recettes'>;
type Data = Recette['data'];
export type Corps = Omit<Data, 'titre' | 'type' | 'categories' | 'vedettes' | 'ordre' | 'versions'> & {
  nom?: string;
  titre?: string;
};
export type Etape = NonNullable<Corps['preparation']>[number];

/** Adresse interne qui tient compte du sous-dossier GitHub Pages. */
export function lien(chemin = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const c = chemin.replace(/^\//, '');
  return `${base}/${c}`;
}

export const lienRecette = (r: Recette) => lien(`recettes/${r.id}/`);

export function versionsDe(d: Data): Corps[] {
  return d.versions?.length ? d.versions : [d];
}

export const typesDe = (d: Data): string[] => (Array.isArray(d.type) ? d.type : [d.type]);

export const lignesIngredients = (c: Corps): string[] =>
  (c.ingredients ?? []).filter((x): x is string => typeof x === 'string');

/** Nombre d'ingrédients de la première version. */
export const nbIngredients = (d: Data) => lignesIngredients(versionsDe(d)[0]).length;

function textes(c: Corps): string[] {
  const out: string[] = [...(c.intro ?? []), ...lignesIngredients(c)];
  for (const e of c.preparation ?? []) {
    if (typeof e === 'string') out.push(e);
    else if ('section' in e) out.push(e.section);
    else out.push(e.titre ?? '', ...e.texte);
  }
  for (const n of c.notes ?? []) out.push(n.titre ?? '', ...n.texte);
  return out;
}

export const texteComplet = (d: Data) => [d.titre, ...versionsDe(d).flatMap(textes)].join(' \n ');

export const estThermomix = (d: Data) => /thermomix/i.test(texteComplet(d));

/** Recette qui se prépare à l'avance, d'après ce qui est écrit (la veille, une nuit, plusieurs jours…). */
export const aLAvance = (d: Data) =>
  /la veille|une nuit|à l[’']avance|plusieurs heures|\b(\d+|deux|trois|quatre)( à \d+)? jours\b/i.test(texteComplet(d));

/** Durée écrite en minutes : « 30 minutes », « 3 min », « 1h20 », « 2 heures ». Première durée seulement. */
export function enMinutes(s: string): number | null {
  const hm = s.match(/(\d+)\s*h\s*(\d{1,2})\b/i);
  if (hm) return +hm[1] * 60 + +hm[2];
  const m = s.match(/(\d+(?:[.,]\d+)?)(?:\s*(?:à|-|–)\s*(\d+(?:[.,]\d+)?))?\s*(minutes?|min\b|mn\b|heures?|h\b)/i);
  if (!m) return null;
  const v = parseFloat((m[2] ?? m[1]).replace(',', '.'));
  return /^h/i.test(m[3]) ? Math.round(v * 60) : Math.round(v);
}

/** Temps indiqués par Claire (jamais estimés). */
export function tempsIndiques(d: Data): { preparation: number | null; cuisson: number | null } {
  const t = versionsDe(d)[0].temps ?? [];
  let preparation: number | null = null;
  let cuisson: number | null = null;
  for (const { label, valeur } of t) {
    const min = enMinutes(valeur);
    if (min == null) continue;
    if (/préparation et cuisson/i.test(label)) {
      preparation ??= min;
      cuisson ??= min;
    } else if (/préparation/i.test(label)) preparation = min;
    else if (/cuisson/i.test(label)) cuisson = min;
  }
  return { preparation, cuisson };
}

export type Portions =
  | { mode: 'personnes'; base: number; max?: number; unite: string; pas: number }
  | { mode: 'multiple' };

const MOTS: Record<string, number> = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, dizaine: 10 };

/** Lit « Pour 4 à 6 personnes », « Pour environ 24 bouchées », « 2/3 personnes »… */
export function lirePortions(texte?: string): Portions {
  if (!texte) return { mode: 'multiple' };
  const m = texte.match(
    /(\d+|une dizaine)(?:\s*(?:à|-|–|\/|ou)\s*(\d+))?\s*(?:de\s+)?(personnes?|portions?|parts?|bouchées?|crêpes?)/i,
  );
  if (!m) return { mode: 'multiple' };
  const base = /\d/.test(m[1]) ? +m[1] : MOTS[m[1].split(' ').pop()!.toLowerCase()];
  const max = m[2] ? +m[2] : undefined;
  let unite = m[3].toLowerCase().replace(/s$/, '');
  if (unite === 'part' || unite === 'portion') unite = 'portion';
  const pas = base >= 12 ? Math.max(1, Math.round(base / 4)) : 1;
  return { mode: 'personnes', base, max, unite, pas };
}

/** Coupe « Titre (précision) » pour afficher la précision plus discrètement. */
export function decouperTitre(t: string): { principal: string; precision?: string } {
  const m = t.match(/^(.*?)\s*(\([^()]*\))\s*$/);
  return m && m[1] ? { principal: m[1], precision: m[2] } : { principal: t };
}

/** Texte sans accents ni majuscules, pour la recherche. */
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
