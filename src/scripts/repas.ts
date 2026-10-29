// Préparer un repas : composer un menu, choisir le nombre d'invités, obtenir le planning et la liste de courses.
import { toast } from './favoris';
import { ajouterAuxCourses, ecrireRepas, lireRepas } from './perso';
import { ajusterQuantites, lignesAffichees, type Portions } from './quantites';

type Recette = { s: string; t: string; u: string; c: string[]; avance: number; tmx: number; p: string };

const MOMENTS: [string, string, string][] = [
  ['apéritif', 'Apéritif', 'un apéritif'],
  ['entrée', 'Entrée', 'une entrée'],
  ['plat', 'Plat', 'un plat'],
  ['accompagnement', 'Accompagnement', 'un accompagnement'],
  ['dessert', 'Dessert', 'un dessert'],
];

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const normaliser = (s: string) =>
  s.toLowerCase().replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Le moment du repas d'une recette ajoutée depuis sa fiche. */
export const momentDe = (categorie: string) =>
  MOMENTS.some(([m]) => m === categorie) ? categorie : categorie === 'soupe' ? 'entrée' : categorie === 'sauce' || categorie === 'base' ? 'accompagnement' : 'plat';

export function initialiserRepas() {
  const toutes: Recette[] = JSON.parse(document.getElementById('donnees-repas')!.textContent!);
  const parSlug = new Map(toutes.map((r) => [r.s, r]));
  const menu = document.getElementById('repas-menu')!;
  const planning = document.getElementById('repas-planning')!;
  const invites = document.getElementById('repas-invites')!;
  const carte = document.getElementById('carte-menu')!;

  const dessiner = () => {
    const repas = lireRepas();
    repas.plats = repas.plats.filter((p) => parSlug.has(p.slug)).map((p) => ({ ...p, moment: momentDe(p.moment) }));
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
          <div class="repas-ajout">
            <input type="search" placeholder="Ajouter ${avecArticle}…" autocomplete="off" data-moment="${cle}" aria-label="Ajouter ${avecArticle}" />
            <ul class="repas-suggestions" hidden></ul>
          </div>
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

    // la carte du menu, pour l'imprimer et la poser sur la table
    const titre = (document.getElementById('repas-titre') as HTMLInputElement).value.trim();
    carte.innerHTML = `
      <p class="carte-kicker">${titre ? echapper(titre) : 'Menu'}</p>
      ${MOMENTS.map(([cle]) => repas.plats.filter((p) => p.moment === cle))
        .filter((l) => l.length)
        .map((l) => `<div class="carte-moment">${l.map((p) => `<p>${echapper(parSlug.get(p.slug)!.t)}</p>`).join('')}</div>`)
        .join('<span class="carte-ornement" aria-hidden="true">✦</span>')}
      <p class="carte-signature">Les 1000 et 1 recettes de Claire</p>`;
  };

  const ajouter = (slug: string, moment: string) => {
    const repas = lireRepas();
    if (!repas.plats.some((p) => p.slug === slug)) repas.plats.push({ slug, moment });
    ecrireRepas(repas);
  };

  // recherche d'une recette à ajouter, en commençant par celles du bon moment
  menu.addEventListener('input', (e) => {
    const champ = e.target as HTMLInputElement;
    if (!champ.dataset.moment) return;
    const liste = champ.nextElementSibling as HTMLElement;
    const q = normaliser(champ.value);
    if (q.length < 2) {
      liste.hidden = true;
      return;
    }
    const mots = q.split(' ');
    const trouvees = toutes
      .filter((r) => mots.every((m) => normaliser(r.t).includes(m)))
      .sort((a, b) => +b.c.includes(champ.dataset.moment!) - +a.c.includes(champ.dataset.moment!))
      .slice(0, 8);
    liste.hidden = trouvees.length === 0;
    liste.innerHTML = trouvees.map((r) => `<li><button type="button" data-ajouter="${r.s}" data-moment="${champ.dataset.moment}">${echapper(r.t)}</button></li>`).join('');
  });
  menu.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    const ajout = cible.closest<HTMLElement>('[data-ajouter]');
    if (ajout) ajouter(ajout.dataset.ajouter!, ajout.dataset.moment!);
    const retrait = cible.closest<HTMLElement>('[data-retirer]');
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
  document.getElementById('repas-titre')!.addEventListener('input', dessiner);
  document.getElementById('repas-imprimer')!.addEventListener('click', () => window.print());
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
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.repas-ajout')) document.querySelectorAll<HTMLElement>('.repas-suggestions').forEach((l) => (l.hidden = true));
  });
  dessiner();
}
