// Ce que chacun garde pour soi dans son navigateur : recettes cuisinées, liste de courses, repas en préparation.

function lire<T>(cle: string, defaut: T): T {
  try {
    return JSON.parse(localStorage.getItem(cle) ?? 'null') ?? defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle: string, valeur: unknown, evenement: string) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* navigation privée : rien n'est gardé */
  }
  window.dispatchEvent(new CustomEvent(evenement));
}

// ---------- recettes déjà cuisinées ----------

const CUISINEES = 'recettes-claire:cuisinees';

/** slug → date (AAAA-MM-JJ) où la recette a été cuisinée. */
export const lireCuisinees = (): Record<string, string> => lire(CUISINEES, {});

export function marquerCuisinee(slug: string, oui: boolean) {
  const c = lireCuisinees();
  if (oui) c[slug] = new Date().toISOString().slice(0, 10);
  else delete c[slug];
  ecrire(CUISINEES, c, 'cuisinees');
}

// ---------- liste de courses ----------

const COURSES = 'recettes-claire:courses';

export type LigneCourses = { i: number; groupe?: string; texte: string };

export type RecetteCourses = {
  slug: string;
  version: number; // 1, 2… pour les recettes en plusieurs versions
  titre: string;
  url: string;
  portions: string; // « pour 6 personnes », « recette × 2 »…
  valeur?: number; // nombre de personnes (ou multiplicateur) choisi sur la recette
  lignes: LigneCourses[];
};

/** cochees : lignes déjà achetées, repérées par « slug|version|position ». */
export type Courses = { recettes: RecetteCourses[]; cochees: string[] };

export const idLigne = (r: { slug: string; version: number }, l: { i: number }) => `${r.slug}|${r.version}|${l.i}`;

export function lireCourses(): Courses {
  const c = lire<Courses>(COURSES, { recettes: [], cochees: [] });
  // listes enregistrées avant la numérotation des lignes
  c.recettes = c.recettes.map((r) => ({ ...r, version: r.version ?? 1, lignes: r.lignes.map((l, k) => ({ ...l, i: l.i ?? k })) }));
  c.cochees = c.cochees.filter((x) => x.includes('|'));
  return c;
}

export const ecrireCourses = (c: Courses) => ecrire(COURSES, c, 'courses');

const meme = (a: { slug: string; version: number }, b: { slug: string; version: number }) => a.slug === b.slug && a.version === b.version;

/** Les lignes de cette recette dans la liste (toutes, quelques-unes, ou aucune : elle est alors retirée). */
export function definirCourses(r: Omit<RecetteCourses, 'lignes'>, lignes: LigneCourses[]) {
  const c = lireCourses();
  const i = c.recettes.findIndex((x) => meme(x, r));
  const entree = { ...r, lignes: [...lignes].sort((a, b) => a.i - b.i) };
  if (!lignes.length) {
    if (i >= 0) c.recettes.splice(i, 1);
  } else if (i >= 0) c.recettes[i] = entree;
  else c.recettes.push(entree);
  const gardees = new Set(c.recettes.flatMap((x) => x.lignes.map((l) => idLigne(x, l))));
  c.cochees = c.cochees.filter((x) => gardees.has(x));
  ecrireCourses(c);
}

export const ajouterAuxCourses = (r: RecetteCourses) => definirCourses(r, r.lignes);

// ---------- repas en préparation ----------

const REPAS = 'recettes-claire:repas';

export type Repas = { invites: number; plats: { slug: string; moment: string }[] };

export const lireRepas = (): Repas => lire(REPAS, { invites: 6, plats: [] });

export const ecrireRepas = (r: Repas) => ecrire(REPAS, r, 'repas');

export const dateCourte = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
