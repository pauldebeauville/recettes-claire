// Produits de saison (France) : mot à chercher dans le titre d'une recette → mois de pleine saison.
// Sert à la sélection « De saison » de l'accueil. Seul le titre compte, pour viser l'ingrédient principal.
import { normaliser } from './recettes';

const SAISONS: [string, number[]][] = [
  ['asperge', [4, 5, 6]],
  ['petits pois', [5, 6, 7]],
  ['radis', [4, 5, 6]],
  ['fraise', [5, 6, 7]],
  ['framboise', [6, 7, 8, 9]],
  ['fruits rouges', [6, 7, 8]],
  ['cerise', [6, 7]],
  ['abricot', [6, 7, 8]],
  ['peche', [7, 8, 9]],
  ['melon', [6, 7, 8, 9]],
  ['mirabelle', [8, 9]],
  ['quetsche', [8, 9, 10]],
  ['figue', [8, 9, 10]],
  ['tomate', [6, 7, 8, 9]],
  ['courgette', [6, 7, 8, 9]],
  ['aubergine', [6, 7, 8, 9]],
  ['poivron', [7, 8, 9]],
  ['concombre', [6, 7, 8]],
  ['legumes d ete', [6, 7, 8, 9]],
  ['potiron', [9, 10, 11, 12]],
  ['potimarron', [9, 10, 11, 12]],
  ['butternut', [9, 10, 11, 12, 1]],
  ['champignon', [9, 10, 11]],
  ['poireau', [10, 11, 12, 1, 2, 3]],
  ['endive', [11, 12, 1, 2, 3]],
  ['patate douce', [10, 11, 12, 1, 2, 3]],
  ['patates douces', [10, 11, 12, 1, 2, 3]],
  ['pomme', [9, 10, 11, 12, 1, 2]],
  ['poire', [9, 10, 11, 12, 1]],
  ['marron', [10, 11, 12, 1]],
  ['noix', [10, 11, 12]],
  ['airelle', [10, 11, 12]],
  ['orange', [12, 1, 2, 3]],
  ['pamplemousse', [12, 1, 2, 3]],
  ['citron', [12, 1, 2, 3]],
  ['saint jacques', [10, 11, 12, 1, 2, 3, 4]],
  ['foie gras', [11, 12]],
  ['buche', [12]],
];

/** Mois (1-12) où la recette est de saison, d'après son titre. */
export function moisDeSaison(titre: string): number[] {
  const t = ` ${normaliser(titre)} `;
  const mois = new Set<number>();
  for (const [mot, m] of SAISONS) {
    // « pomme » ne doit pas trouver « pommes de terre »
    if (mot === 'pomme' && /pommes? de terre/.test(t)) continue;
    if (t.includes(` ${mot}`)) m.forEach((x) => mois.add(x));
  }
  return [...mois].sort((a, b) => a - b);
}
