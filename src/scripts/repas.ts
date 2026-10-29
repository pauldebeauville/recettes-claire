// Préparer un repas : composer un menu, choisir le nombre d'invités, obtenir le planning et la liste de courses.
import { toast } from './toast';
import { ajouterAuxCourses, ecrireRepas, lireRepas } from './perso';
import { ajusterQuantites, lignesAffichees, type Portions } from './quantites';

// m : les moments où la recette peut se servir ; g : l'intertitre des plats (Viande, Poisson…)
type Recette = { s: string; t: string; u: string; m: string[]; g: string; avance: number; tmx: number; p: string };

const MOMENTS: [string, string, string][] = [
  ['apéritif', 'Apéritif', 'un apéritif'],
  ['entrée', 'Entrée', 'une entrée'],
  ['plat', 'Plat', 'un plat'],
  ['accompagnement', 'Accompagnement', 'un accompagnement'],
  ['dessert', 'Dessert', 'un dessert'],
];

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GROUPES_PLATS = ['Viande', 'Volaille', 'Poisson', 'Légumes', 'Œufs', 'Autres'];

export function initialiserRepas() {
  const toutes: Recette[] = JSON.parse(document.getElementById('donnees-repas')!.textContent!);
  const parSlug = new Map(toutes.map((r) => [r.s, r]));
  const menu = document.getElementById('repas-menu')!;
  const planning = document.getElementById('repas-planning')!;
  const invites = document.getElementById('repas-invites')!;

  const dessiner = () => {
    const repas = lireRepas();
    // une recette reste au moment où elle peut se servir (les bases, ou un dessert mal rangé, sont écartés)
    repas.plats = repas.plats
      .filter((p) => parSlug.has(p.slug))
      .map((p) => ({ ...p, moment: parSlug.get(p.slug)!.m.includes(p.moment) ? p.moment : parSlug.get(p.slug)!.m[0] }));
    const auMenu = new Set(repas.plats.map((p) => p.slug));
    const option = (r: Recette) => `<option value="${r.s}">${echapper(r.t)}</option>`;
    invites.textContent = String(repas.invites);
    menu.innerHTML = MOMENTS.map(([cle, nom, avecArticle]) => {
      const plats = repas.plats.filter((p) => p.moment === cle);
      return `
        <section class="repas-moment" data-moment="${cle}">
          <h2>${nom}</h2>
          <ul>${plats
            .map((p) => {
              const r = parSlug.get(p.slug)!;
              return `<li><a href="${r.u}">${echapper(r.t)}</a>${r.p ? `<span>${echapper(r.p)}</span>` : ''}<button type="button" class="repas-retirer" data-retirer="${r.s}" aria-label="Retirer ${echapper(r.t)} du menu">×</button></li>`;
            })
            .join('')}</ul>
          <label class="repas-choix">
            <span class="visuellement-cache">Choisir ${avecArticle}</span>
            <select data-moment="${cle}">
              <option value="">Choisir ${avecArticle}…</option>
              ${listeDuMoment(cle, auMenu, option)}
            </select>
          </label>
        </section>`;
    }).join('');

    const choisis = repas.plats.map((p) => parSlug.get(p.slug)!);
    const avance = choisis.filter((r) => r.avance);
    const jourJ = choisis.filter((r) => !r.avance);
    planning.hidden = choisis.length === 0;
    planning.querySelector('.planning-avance')!.innerHTML = avance.length
      ? avance.map((r) => `<li><a href="${r.u}">${echapper(r.t)}</a></li>`).join('')
      : '<li class="vide">Rien à préparer à l’avance.</li>';
    planning.querySelector('.planning-jour')!.innerHTML = jourJ.length
      ? jourJ.map((r) => `<li><a href="${r.u}">${echapper(r.t)}</a>${r.tmx ? ' <span class="badge">Thermomix</span>' : ''}</li>`).join('')
      : '<li class="vide">Tout est prêt la veille !</li>';
    document.getElementById('repas-courses')!.toggleAttribute('disabled', choisis.length === 0);
  };

  /** Les recettes proposées pour un moment, par ordre alphabétique ; les plats sous des intertitres. */
  function listeDuMoment(moment: string, auMenu: Set<string>, option: (r: Recette) => string): string {
    const possibles = toutes.filter((r) => r.m.includes(moment) && !auMenu.has(r.s));
    if (moment !== 'plat') return possibles.map(option).join('');
    return GROUPES_PLATS.map((g) => {
      const liste = possibles.filter((r) => r.g === g);
      return liste.length ? `<optgroup label="${g}">${liste.map(option).join('')}</optgroup>` : '';
    }).join('');
  }

  const ajouter = (slug: string, moment: string) => {
    const repas = lireRepas();
    if (!repas.plats.some((p) => p.slug === slug)) repas.plats.push({ slug, moment });
    ecrireRepas(repas);
  };

  // choisir dans la liste suffit : la recette rejoint le menu, la liste revient à « Choisir… »
  menu.addEventListener('change', (e) => {
    const liste = e.target as HTMLSelectElement;
    if (liste.dataset.moment && liste.value) ajouter(liste.value, liste.dataset.moment);
  });
  menu.addEventListener('click', (e) => {
    const retrait = (e.target as HTMLElement).closest<HTMLElement>('[data-retirer]');
    if (retrait) {
      const repas = lireRepas();
      repas.plats = repas.plats.filter((p) => p.slug !== retrait.dataset.retirer);
      ecrireRepas(repas);
    }
  });
  document.querySelectorAll<HTMLButtonElement>('[data-invites]').forEach((b) =>
    b.addEventListener('click', () => {
      const repas = lireRepas();
      repas.invites = Math.min(40, Math.max(1, repas.invites + +b.dataset.invites!));
      ecrireRepas(repas);
    }),
  );
  document.getElementById('repas-vider')!.addEventListener('click', () => {
    if (confirm('Effacer ce menu ?')) ecrireRepas({ invites: lireRepas().invites, plats: [] });
  });

  // toutes les recettes du menu vont dans la liste de courses, pour le nombre d'invités
  document.getElementById('repas-courses')!.addEventListener('click', async (e) => {
    const bouton = e.currentTarget as HTMLButtonElement;
    const repas = lireRepas();
    bouton.disabled = true;
    bouton.textContent = 'Préparation de la liste…';
    let ok = 0;
    for (const p of repas.plats) {
      const r = parSlug.get(p.slug);
      if (!r) continue;
      try {
        const html = await (await fetch(r.u)).text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const v = doc.querySelector<HTMLElement>('.version')!;
        const portions: Portions = JSON.parse(v.dataset.portions!);
        // les recettes « pour 4 personnes » suivent le nombre d'invités ; les autres (sauces, bouchées…) restent telles quelles
        const parPersonnes = portions.mode === 'personnes' && portions.unite === 'personne';
        ajusterQuantites(v, parPersonnes ? repas.invites / portions.base : 1);
        ajouterAuxCourses({
          slug: r.s,
          version: 1,
          valeur: parPersonnes ? repas.invites : 1,
          titre: r.t,
          url: r.u,
          portions: parPersonnes ? `pour ${repas.invites} personnes` : 'recette × 1',
          lignes: lignesAffichees(v),
        });
        ok++;
      } catch {
        /* recette inaccessible (hors connexion ?) : on continue */
      }
    }
    bouton.disabled = false;
    bouton.textContent = 'Tout ajouter à la liste de courses';
    toast(ok ? `${ok} recette${ok > 1 ? 's' : ''} ajoutée${ok > 1 ? 's' : ''} à la liste de courses` : 'Impossible de préparer la liste');
  });

  window.addEventListener('repas', dessiner);
  window.addEventListener('storage', (e) => e.key === 'recettes-claire:repas' && dessiner());
  dessiner();
}
