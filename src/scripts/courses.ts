// Liste de courses : ingrédients des recettes ajoutées, regroupés, à cocher au magasin.
import { toast } from './favoris';
import { ecrireCourses, idLigne, lireCourses, type Courses } from './perso';

type Ligne = { cle: string; texte: string; recettes: string[]; sources: string[] };

const UNITES: Record<string, [string, number]> = {
  mg: ['g', 0.001],
  g: ['g', 1],
  kg: ['g', 1000],
  ml: ['ml', 1],
  cl: ['ml', 10],
  dl: ['ml', 100],
  l: ['ml', 1000],
  litre: ['ml', 1000],
  litres: ['ml', 1000],
};

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const normaliser = (s: string) =>
  s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const nombre = (t: string) => {
  const f: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  if (t in f) return f[t];
  if (t.includes('/')) {
    const [a, b] = t.split('/');
    return +a / +b;
  }
  return parseFloat(t.replace(',', '.'));
};

const NB = String.raw`(\d+(?:[.,]\d+)?|\d+\/\d+|[½¼¾])`;
const U = String.raw`(kg|mg|g|cl|ml|dl|litres?|l)`;
// « 200 g de farine », « 1/2 litre de lait »
const AVANT = new RegExp(String.raw`^${NB}\s*${U}\s+(?:de\s+|d['’]\s*)?(.+)$`, 'i');
// « Farine : 200 g » (carnet sucré)
const APRES = new RegExp(String.raw`^(.+?)\s*:\s*${NB}\s*${U}\b\.?\s*(.*)$`, 'i');

/** « 200 g de farine » → { nom, quantite en g ou ml, unite } ; null si ça ne se lit pas simplement. */
function lire(texte: string): { nom: string; q: number; u: string } | null {
  let m = texte.match(AVANT);
  if (m && !/[+]|\bou\b|\bà\b/.test(texte.split(m[3])[0])) {
    const [u, k] = UNITES[m[2].toLowerCase()];
    return { nom: m[3], q: nombre(m[1]) * k, u };
  }
  m = texte.match(APRES);
  if (m && !m[5]) {
    const [u, k] = UNITES[m[3].toLowerCase()];
    return { nom: m[1], q: nombre(m[2]) * k, u };
  }
  return null;
}

const quantite = (q: number, u: string) => {
  const f = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  if (u === 'g') return q >= 1000 ? `${f(q / 1000)} kg` : `${f(Math.round(q))} g`;
  if (q >= 1000) return `${f(q / 1000)} l`;
  return q % 10 === 0 ? `${f(q / 10)} cl` : `${f(q)} ml`;
};

/** « 200 g de farine » → « farine », pour ranger la liste par ordre alphabétique. */
const nomSeul = (t: string) => normaliser(t.replace(/^[≈\d\s,./½¼¾]*(kg|g|cl|ml|l|c\.|cuil\S*)?\s*(de |d’|d')?/i, ''));

/** Regroupe les ingrédients identiques des différentes recettes. */
function regrouper(c: Courses): Ligne[] {
  const lignes = new Map<string, Ligne & { q?: number; u?: string; nom?: string }>();
  c.recettes.forEach((r) => {
    r.lignes.forEach((l) => {
      const source = idLigne(r, l);
      const lu = lire(l.texte);
      const cle = lu ? `${normaliser(lu.nom)}|${lu.u}` : normaliser(l.texte);
      const deja = lignes.get(cle);
      if (deja) {
        if (lu && deja.q != null) deja.q += lu.q;
        if (!deja.recettes.includes(r.titre)) deja.recettes.push(r.titre);
        deja.sources.push(source);
      } else {
        lignes.set(cle, { cle, texte: l.texte, recettes: [r.titre], sources: [source], q: lu?.q, u: lu?.u, nom: lu?.nom });
      }
    });
  });
  return [...lignes.values()]
    .map((l) => ({
      cle: l.cle,
      texte: l.sources.length > 1 && l.q != null ? `${quantite(l.q, l.u!)} de ${l.nom}`.replace(/ de ([aeiouhéèêœ])/i, ' d’$1') : l.texte,
      recettes: l.recettes,
      sources: l.sources,
    }))
    .sort((a, b) => nomSeul(a.texte).localeCompare(nomSeul(b.texte), 'fr'));
}

export function initialiserCourses() {
  const zone = document.getElementById('courses-liste')!;
  const vide = document.getElementById('courses-vide')!;
  const outils = document.getElementById('courses-outils')!;
  // par défaut, chaque ingrédient reste rangé sous sa recette
  let vue: 'tout' | 'recettes' = 'recettes';

  const dessiner = () => {
    const c = lireCourses();
    const cochees = new Set(c.cochees);
    vide.hidden = c.recettes.length > 0;
    outils.hidden = c.recettes.length === 0;
    zone.hidden = c.recettes.length === 0;
    document.querySelectorAll<HTMLButtonElement>('[data-vue-courses]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.vueCourses === vue)));
    if (!c.recettes.length) return (zone.innerHTML = '');

    const recettes = `
      <ul class="courses-recettes">
        ${c.recettes
          .map(
            (r) => `
          <li>
            <a href="${r.url}">${echapper(r.titre)}</a> <span>${echapper(r.portions)}</span>
            <button type="button" class="courses-retirer" data-retirer="${r.slug}|${r.version}" aria-label="Retirer ${echapper(r.titre)} de la liste">Retirer</button>
          </li>`,
          )
          .join('')}
      </ul>`;

    let contenu: string;
    if (vue === 'tout') {
      const lignes = regrouper(c);
      const restants = lignes.filter((l) => !l.sources.every((s) => cochees.has(s))).length;
      contenu = `
        <p class="courses-compte">${restants} article${restants > 1 ? 's' : ''} à acheter sur ${lignes.length}</p>
        <ul class="courses-lignes">${lignes
          .map(
            (l) => `
          <li>
            <label>
              <input type="checkbox" data-sources="${l.sources.join(',')}" ${l.sources.every((s) => cochees.has(s)) ? 'checked' : ''} />
              <span>${echapper(l.texte)}${c.recettes.length > 1 ? `<small>${l.recettes.map(echapper).join(' · ')}</small>` : ''}</span>
            </label>
          </li>`,
          )
          .join('')}</ul>`;
    } else {
      contenu = c.recettes
        .map(
          (r) => `
        <section class="courses-groupe">
          <header class="courses-groupe-tete">
            <h2><a href="${r.url}">${echapper(r.titre)}</a> <span>${echapper(r.portions)} · ${r.lignes.length} ingrédient${r.lignes.length > 1 ? 's' : ''}</span></h2>
            <button type="button" class="courses-retirer" data-retirer="${r.slug}|${r.version}" aria-label="Retirer ${echapper(r.titre)} de la liste">Retirer</button>
          </header>
          <ul class="courses-lignes">${r.lignes
            .map((l, il, tout) => {
              const s = idLigne(r, l);
              const titre = l.groupe && l.groupe !== tout[il - 1]?.groupe ? `<li class="courses-sous-groupe">${echapper(l.groupe)}</li>` : '';
              return `${titre}<li><label><input type="checkbox" data-sources="${s}" ${cochees.has(s) ? 'checked' : ''} /><span>${echapper(l.texte)}</span></label></li>`;
            })
            .join('')}</ul>
        </section>`,
        )
        .join('');
    }
    const titre = `<h2 class="courses-titre-recettes">${c.recettes.length} recette${c.recettes.length > 1 ? 's' : ''}</h2>`;
    zone.innerHTML = vue === 'tout' ? `${titre}${recettes}${contenu}` : `${titre}${contenu}`;
  };

  zone.addEventListener('change', (e) => {
    const box = e.target as HTMLInputElement;
    if (!box.dataset.sources) return;
    const c = lireCourses();
    const cochees = new Set(c.cochees);
    box.dataset.sources.split(',').forEach((s) => (box.checked ? cochees.add(s) : cochees.delete(s)));
    c.cochees = [...cochees];
    ecrireCourses(c);
  });
  zone.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-retirer]');
    if (!b) return;
    const c = lireCourses();
    const avant = structuredClone(c);
    const [slug, version] = b.dataset.retirer!.split('|');
    const titre = c.recettes.find((r) => r.slug === slug && r.version === +version)?.titre ?? 'La recette';
    c.recettes = c.recettes.filter((r) => !(r.slug === slug && r.version === +version));
    c.cochees = c.cochees.filter((x) => !x.startsWith(`${slug}|${version}|`));
    ecrireCourses(c);
    toast(`${titre} retirée de la liste`, { libelle: 'Annuler', action: () => ecrireCourses(avant) });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-vue-courses]').forEach((b) =>
    b.addEventListener('click', () => {
      vue = b.dataset.vueCourses as 'tout' | 'recettes';
      dessiner();
    }),
  );
  document.getElementById('courses-vider')!.addEventListener('click', () => {
    if (!confirm('Vider toute la liste de courses ?')) return;
    ecrireCourses({ recettes: [], cochees: [] });
  });
  document.getElementById('courses-decocher')!.addEventListener('click', () => {
    const c = lireCourses();
    c.cochees = [];
    ecrireCourses(c);
  });
  document.getElementById('courses-partager')!.addEventListener('click', async () => {
    const c = lireCourses();
    const cochees = new Set(c.cochees);
    const lignes = regrouper(c).filter((l) => !l.sources.every((s) => cochees.has(s)));
    const texte = [
      'Liste de courses',
      `(${c.recettes.map((r) => `${r.titre}, ${r.portions}`).join(' ; ')})`,
      '',
      ...lignes.map((l) => `• ${l.texte}`),
    ].join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Liste de courses', text: texte });
      } catch {
        /* annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(texte);
      toast('Liste copiée : collez-la dans un message');
    } catch {
      toast('Impossible de copier la liste');
    }
  });
  window.addEventListener('courses', dessiner);
  window.addEventListener('storage', (e) => e.key === 'recettes-claire:courses' && dessiner());
  dessiner();
}
