// Transforme le texte des fiches en HTML : quantités ajustables et minuteurs cliquables.
// Le texte affiché par défaut reste exactement celui de la fiche.

const FRAC = '½¼¾⅓⅔⅛';
const NUM = `(?:\\d+\\s?[${FRAC}]|\\d+[.,]\\d+|\\d+\\/\\d+|\\d+|[${FRAC}])`;
const QTE = new RegExp(`(${NUM})(?:(\\s*(?:à|-|–|ou)\\s*)(${NUM}))?`, 'g');
const VALEUR_FRAC: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

// après le nombre : ce n'est pas une quantité à ajuster
const PAS_UNE_QUANTITE = /^\s*(cm|mm|°|%|min\b|minutes?|mn\b|h\b|heures?|sec\b|secondes?|jours?|x\s*\d|ème|e\b|personnes?)/i;
// la quantité est donnée « par personne », « par kg », « chacune »…
const PAR_UNITE = /\b(par\s+\S+|chacune?s?)\b|\/\s*personne/i;
const UNITES_ABREGEES = new Set(['g', 'kg', 'mg', 'cl', 'ml', 'dl', 'l', 'c', 'cs', 'cc', 'càs', 'càc', 'th']);
const MOTS_OUTILS = new Set(['à', 'a', 'de', 'du', 'des', 'd', 'ou', 'et', 'par', 'pour', 'environ', 'en', 'au', 'aux', 'la', 'le', 'les']);
const INVARIABLES = new Set(['pois', 'radis', 'anchois', 'maïs', 'jus', 'noix', 'frais', 'gros', 'fois', 'bras', 'poids', 'riz', 'cassis', 'brebis', 'souris', 'ananas', 'kiwis']);

export function valeur(s: string): number {
  s = s.replace(/\s/g, '');
  const f = s.match(new RegExp(`^(\\d*)([${FRAC}])$`));
  if (f) return (f[1] ? +f[1] : 0) + VALEUR_FRAC[f[2]];
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    return +a / +b;
  }
  return parseFloat(s.replace(',', '.'));
}

function genre(apres: string): 'masse' | 'grand' | 'cuillere' | 'nombre' {
  if (/^\s*(kg|l|litres?)\b/i.test(apres)) return 'grand';
  if (/^\s*(g|mg|cl|ml|dl)\b/i.test(apres)) return 'masse';
  if (/^\s*(c\.|cuil|cuill|càs|càc|cs\b|cc\b|pincées?|verres?|tasses?|sachets?|noix\b|noisettes?\b)/i.test(apres)) return 'cuillere';
  return 'nombre';
}

function formes(mot: string, valeurOrigine: number): { s: string; p: string } | null {
  const bas = mot.toLowerCase();
  if (mot.includes('-') || UNITES_ABREGEES.has(bas) || MOTS_OUTILS.has(bas) || INVARIABLES.has(bas)) return null;
  if (valeurOrigine >= 2) {
    // forme plurielle donnée
    if (/eaux$/.test(mot)) return { s: mot.slice(0, -1), p: mot };
    if (/aux$/.test(mot)) return { s: mot.slice(0, -3) + 'al', p: mot };
    if (/[sx]$/.test(mot)) return { s: mot.slice(0, -1), p: mot };
    return null;
  }
  if (/[sxz]$/.test(mot)) return { s: mot, p: mot };
  if (/al$/.test(mot)) return { s: mot, p: mot.slice(0, -2) + 'aux' };
  if (/(eau|eu)$/.test(mot)) return { s: mot, p: mot + 'x' };
  return { s: mot, p: mot + 's' };
}

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Une ligne d'ingrédient → HTML avec des <span class="q"> ajustables. */
export function ingredientHtml(ligne: string): string {
  let html = '';
  let pos = 0;
  QTE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = QTE.exec(ligne)); ) {
    const avant = ligne.slice(0, m.index);
    const apres = ligne.slice(m.index + m[0].length);
    const colle = /[\p{L}\d/.,×+]$/u.test(avant) || /^[\d/]/.test(apres);
    const clause = apres.split(/[(),;]|\s\+\s/)[0];
    // « 1 cm de gingembre » est une quantité, « moule de 18 cm de diamètre » non
    const longueurIngredient = /^\s*cm\s+d(e\s|’|')(?!diamètre|haut|long|côté|large|épaisseur)/i.test(apres);
    if (colle || /th\.?\s*$/i.test(avant) || /\d\s*x\s*$/i.test(avant) || (PAS_UNE_QUANTITE.test(apres) && !longueurIngredient) || PAR_UNITE.test(clause)) {
      continue;
    }
    const v1 = valeur(m[1]);
    const v2 = m[3] ? valeur(m[3]) : undefined;
    if (!isFinite(v1) || (v2 !== undefined && !isFinite(v2))) continue;
    const fraction = /[\/½¼¾⅓⅔⅛]/.test(m[0]);
    const g = genre(apres);
    html += echapper(ligne.slice(pos, m.index));
    html += `<span class="q" data-v="${v1}"${v2 !== undefined ? ` data-v2="${v2}" data-sep="${echapper(m[2])}"` : ''} data-g="${g}"${fraction ? ' data-f="1"' : ''} data-o="${echapper(m[0])}">${echapper(m[0])}</span>`;
    pos = m.index + m[0].length;
    // le mot qui suit s'accorde (1 avocat → 2 avocats)
    const mot = apres.match(/^(\s+)([\p{L}’']+)(?=[\s,.;:)]|$)/u);
    if (mot && g !== 'masse' && g !== 'grand') {
      const f = formes(mot[2], v2 ?? v1);
      if (f) {
        html += `${mot[1]}<span class="w" data-s="${echapper(f.s)}" data-p="${echapper(f.p)}" data-o="${echapper(mot[2])}">${echapper(mot[2])}</span>`;
        pos += mot[0].length;
        QTE.lastIndex = pos;
      }
    }
  }
  return html + echapper(ligne.slice(pos));
}

const DUREE = /(\d+)\s*h\s*(\d{1,2})\b|(\d+(?:[.,]\d+)?)(?:\s*(?:à|-|–|et|ou)\s*(\d+(?:[.,]\d+)?))?\s*(minutes?|min\b|mn\b|heures?|h\b)/gi;

/** Texte d'une étape → HTML avec des minuteurs cliquables sur les durées. */
export function etapeHtml(texte: string): string {
  let html = '';
  let pos = 0;
  DUREE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = DUREE.exec(texte)); ) {
    if (/[\d/]$/.test(texte.slice(0, m.index))) continue;
    let secondes: number;
    if (m[1]) secondes = (+m[1] * 60 + +m[2]) * 60;
    else {
      const v = parseFloat(m[3].replace(',', '.'));
      secondes = Math.round((/^h/i.test(m[5]) ? v * 3600 : v * 60));
    }
    if (!secondes || secondes > 12 * 3600) continue;
    html += echapper(texte.slice(pos, m.index));
    html += `<button type="button" class="minuteur" data-s="${secondes}" title="Lancer un minuteur">${iconeMinuteur}${echapper(m[0])}</button>`;
    pos = m.index + m[0].length;
  }
  return html + echapper(texte.slice(pos));
}

const iconeMinuteur =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2h5"/></svg>';

export const texteHtml = echapper;
