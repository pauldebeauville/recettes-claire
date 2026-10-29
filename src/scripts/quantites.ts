// Recalcul des quantités d'ingrédients (portions) : fractions, arrondis, accords.

export type Portions = { mode: 'personnes'; base: number; max?: number; unite: string; pas: number } | { mode: 'multiple' };

export const MULTIPLES = [0.5, 1, 1.5, 2, 3, 4, 5, 6];
const ESPACE_FINE = ' ';
const FRACTIONS: [number, string][] = [
  [0, ''],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

export function enFraction(v: number, pas: number): { valeur: number; texte: string } {
  // pas d'un quart ou d'un demi, en gardant les tiers quand ils tombent juste
  const tiers = Math.round(v * 3) / 3;
  let r = Math.abs(tiers - v) < 0.02 && Math.abs(tiers - Math.round(tiers * 2) / 2) > 0.1 ? tiers : Math.round(v / pas) * pas;
  if (r <= 0) r = pas;
  const entier = Math.floor(r + 1e-9);
  const reste = r - entier;
  const f = FRACTIONS.find(([x]) => Math.abs(x - reste) < 0.02)?.[1] ?? '';
  return { valeur: r, texte: entier ? (f ? `${entier}${ESPACE_FINE}${f}` : String(entier)) : f };
}

const decimal = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function arrondirDecimal(v: number, g: string): number {
  const pas =
    g === 'grand' ? (v < 1 ? 0.05 : v < 5 ? 0.1 : 0.25) : v < 10 ? 0.5 : v < 25 ? 1 : v < 100 ? 5 : v < 1000 ? 10 : 50;
  return Math.max(pas, Math.round(v / pas) * pas);
}

/** Met en forme une quantité recalculée. */
function formater(v: number, g: string, fraction: boolean): { valeur: number; texte: string; approx: boolean } {
  if (g === 'cuillere' || fraction) {
    const f = enFraction(v, v < 3 ? 0.25 : 0.5);
    return { ...f, approx: false };
  }
  if (g === 'nombre') {
    if (v < 1) return { ...enFraction(v, 0.25), approx: false };
    const r = Math.round(v);
    return { valeur: r, texte: String(r), approx: Math.abs(r - v) / v > 0.15 };
  }
  const r = arrondirDecimal(v, g);
  return { valeur: r, texte: decimal(r), approx: false };
}

export function ajusterQuantites(racine: HTMLElement, facteur: number) {
  racine.querySelectorAll<HTMLElement>('.q').forEach((q) => {
    const mot = q.nextSibling?.nodeType === 3 && /^\s+$/.test(q.nextSibling.textContent!) ? (q.nextSibling.nextSibling as HTMLElement | null) : null;
    const accord = mot?.classList?.contains('w') ? mot : null;
    if (facteur === 1) {
      q.textContent = q.dataset.o!;
      q.classList.remove('change');
      if (accord) accord.textContent = accord.dataset.o!;
      return;
    }
    const g = q.dataset.g!;
    const fraction = !!q.dataset.f;
    const a = formater(+q.dataset.v! * facteur, g, fraction);
    let texte = a.texte;
    let max = a.valeur;
    if (q.dataset.v2) {
      const b = formater(+q.dataset.v2 * facteur, g, fraction);
      texte = b.texte === a.texte ? a.texte : `${a.texte}${q.dataset.sep}${b.texte}`;
      max = b.valeur;
    }
    q.textContent = (a.approx ? '≈ ' : '') + texte;
    q.classList.add('change');
    if (accord) accord.textContent = max >= 2 ? accord.dataset.p! : accord.dataset.s!;
  });
}

export type LigneAffichee = { i: number; groupe?: string; texte: string };

/** Lignes d'ingrédients telles qu'affichées (quantités déjà recalculées), avec leur sous-titre et leur position. */
export function lignesAffichees(version: ParentNode): LigneAffichee[] {
  let groupe: string | undefined;
  const lignes: LigneAffichee[] = [];
  version.querySelectorAll<HTMLElement>('.liste-ingredients > li').forEach((li) => {
    if (li.classList.contains('groupe')) groupe = li.textContent!.trim();
    else lignes.push({ i: +li.dataset.i!, groupe, texte: li.querySelector('.ingredient')!.textContent!.replace(/\s+/g, ' ').trim() });
  });
  return lignes;
}
