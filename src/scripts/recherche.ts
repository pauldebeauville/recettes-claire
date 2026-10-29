// Recherche tolérante : sans accents, au singulier comme au pluriel, avec une faute de frappe.

export const MOTS_VIDES = new Set(['de', 'la', 'le', 'les', 'du', 'des', 'et', 'a', 'au', 'aux', 'en', 'd', 'l', 'un', 'une', 'avec', 'pour', 'sur']);
export const SYNONYMES: Record<string, string> = { st: 'saint', ste: 'sainte', tmx: 'thermomix' };

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

export const singulier = (m: string) => (m.length > 3 ? m.replace(/(s|x)$/, '') : m);

function proche(a: string, b: string): boolean {
  // une lettre de différence (oubli, ajout ou faute de frappe)
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let ecarts = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++ecarts > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return ecarts + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Le mot (ou le début de mot) tapé se trouve-t-il dans la liste ?
 * La tolérance aux fautes ne sert que si le mot n'existe nulle part dans le carnet (approx),
 * sinon « oignon » trouverait aussi « pignons ».
 */
export function trouve(jeton: string, mots: string[], approx = true): boolean {
  for (const m of mots) {
    if (m.startsWith(jeton) || singulier(m) === jeton) return true;
    if (approx && jeton.length >= 5 && (proche(jeton, m) || (m.length > jeton.length && proche(jeton, m.slice(0, jeton.length))))) return true;
  }
  return false;
}

/** Vrai si le mot existe tel quel (ou en début de mot) dans le vocabulaire du carnet. */
export const existe = (jeton: string, vocabulaire: string[]) => vocabulaire.some((m) => m.startsWith(jeton) || singulier(m) === jeton);
