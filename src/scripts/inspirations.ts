// Accueil : la recette du jour et des sélections (de saison, pour recevoir…).
// Le choix change chaque jour, et c'est le même pour tout le monde ce jour-là.

type Fiche = {
  s: string;
  u: string;
  ph: string;
  t: string;
  x: string;
  c: string;
  k: string;
  y: string;
  p: string;
  n: number;
  o: number;
  tmx: number;
  a: { t: string; x: string } | null;
  m: number[];
  jour: number;
  recevoir: number;
  peu: number;
  dessert: number;
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const COEUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="coeur" d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.6 3.8 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.2 0 5.3 3.1 4.2 6.2C19.5 15.4 12 20 12 20Z"/></svg>';

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Hasard reproductible : même graine, même tirage. */
function hasard(graine: string) {
  let h = 1779033703 ^ graine.length;
  for (let i = 0; i < graine.length; i++) h = Math.imul(h ^ graine.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function melanger<T>(liste: T[], graine: string): T[] {
  const r = hasard(graine);
  const out = [...liste];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function carte(f: Fiche, compacte = false): string {
  return `
    <li class="fiche${compacte ? ' fiche--compacte' : ''}" style="--teinte:${f.k}" data-slug="${f.s}">
      <a href="${f.u}">
        ${f.ph ? `<img class="fiche-photo" src="${f.ph}" alt="" loading="lazy" />` : ''}
        <span class="fiche-kicker">${echapper(f.c)}<span class="fiche-type">${echapper(f.y)}</span></span>
        <h3 class="fiche-titre">${echapper(f.t)}${f.x ? `<span class="precision"> ${echapper(f.x)}</span>` : ''}</h3>
        <span class="fiche-meta">${f.p ? `<span>${echapper(f.p)}</span>` : ''}<span>${f.n} ingrédients</span>${f.tmx ? '<span class="badge">Thermomix</span>' : ''}</span>
      </a>
      <button type="button" class="fav" aria-pressed="false" data-slug="${f.s}" aria-label="Ajouter « ${echapper(f.t)} » aux favoris">${COEUR}</button>
      <span class="fiche-lettre" aria-hidden="true">${echapper(f.t.charAt(0))}</span>
    </li>`;
}

function rangee(id: string, titre: string, sousTitre: string, fiches: Fiche[], voirTout?: string, libelle = 'Tout voir'): string {
  if (fiches.length < 3) return '';
  return `
    <section class="rangee" aria-labelledby="rangee-${id}">
      <header class="rangee-tete">
        <div>
          <h2 id="rangee-${id}">${titre}</h2>
          <p>${sousTitre}</p>
        </div>
        ${voirTout ? `<a class="rangee-tout" href="${voirTout}">${libelle}</a>` : ''}
      </header>
      <ul class="rangee-liste">${fiches.map((f) => carte(f, true)).join('')}</ul>
    </section>`;
}

export function initialiserInspirations(base: string) {
  const zone = document.getElementById('inspirations');
  const source = document.getElementById('donnees-inspirations');
  if (!zone || !source) return;
  const toutes: Fiche[] = JSON.parse(source.textContent!);
  const maintenant = new Date();
  const jour = maintenant.toISOString().slice(0, 10);
  const mois = maintenant.getMonth() + 1;
  const dateLongue = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const candidats = toutes.filter((f) => f.jour);
  let duJour = melanger(candidats, `jour-${jour}`)[0];
  let autres = 0;

  const dessinerDuJour = () => {
    const el = zone.querySelector<HTMLElement>('.du-jour')!;
    el.style.setProperty('--teinte', duJour.k);
    el.querySelector('.du-jour-kicker')!.textContent = autres ? 'Une autre idée' : `La recette du jour · ${dateLongue}`;
    el.querySelector<HTMLAnchorElement>('.du-jour-lien')!.href = duJour.u;
    el.querySelector('.du-jour-titre')!.innerHTML = `${echapper(duJour.t)}${duJour.x ? ` <span class="precision">${echapper(duJour.x)}</span>` : ''}`;
    el.querySelector('.du-jour-meta')!.textContent = [duJour.c, duJour.p, `${duJour.n} ingrédients`].filter(Boolean).join(' · ');
    const astuce = el.querySelector<HTMLElement>('.du-jour-astuce')!;
    astuce.hidden = !duJour.a;
    if (duJour.a) {
      astuce.querySelector('.du-jour-astuce-titre')!.textContent = duJour.a.t || 'Le mot de Claire';
      astuce.querySelector('q')!.textContent = duJour.a.x;
    }
  };

  const saison = melanger(toutes.filter((f) => f.m.includes(mois)), `saison-${jour}`).slice(0, 4);
  const recevoir = melanger(toutes.filter((f) => f.recevoir), `recevoir-${jour}`).slice(0, 4);
  const peu = melanger(toutes.filter((f) => f.peu), `peu-${jour}`).slice(0, 4);
  const desserts = melanger(toutes.filter((f) => f.dessert), `desserts-${jour}`).slice(0, 4);
  const tmx = melanger(toutes.filter((f) => f.tmx), `tmx-${jour}`).slice(0, 4);

  zone.innerHTML = `
    <section class="frigo" id="frigo" aria-labelledby="titre-frigo">
      <div class="frigo-tete">
        <h2 id="titre-frigo">Dans mon frigo, j’ai…</h2>
        <p>Tapez ce que vous avez sous la main, le carnet vous propose une recette.</p>
      </div>
      <div class="frigo-saisie">
        <ul class="frigo-puces" aria-label="Vos ingrédients"></ul>
        <input type="text" list="vocabulaire-frigo" placeholder="Ex. : poireaux, crème, lardons" aria-label="Ajouter un ingrédient" enterkeyhint="done" autocomplete="off" />
      </div>
      <div class="frigo-boutons">
        <button type="button" class="bouton bouton-principal frigo-chercher">Trouver une recette</button>
        <button type="button" class="bouton frigo-vider">Vider</button>
      </div>
      <div class="frigo-resultats" aria-live="polite" hidden></div>
    </section>
    <div class="progression" id="progression" hidden></div>
    <article class="du-jour">
      <a class="du-jour-lien">
        <p class="du-jour-kicker kicker"></p>
        <h2 class="du-jour-titre"></h2>
        <p class="du-jour-meta"></p>
        <blockquote class="du-jour-astuce" hidden><p class="du-jour-astuce-titre"></p><q></q></blockquote>
        <span class="du-jour-voir">Voir la recette →</span>
      </a>
      <button type="button" class="bouton du-jour-autre">Une autre idée</button>
    </article>
    ${rangee('saison', `De saison en ${MOIS[mois - 1]}`, 'Les produits du moment', saison)}
    <details class="plus-idees">
      <summary>Plus d’idées <span>pour recevoir, desserts, en quelques ingrédients, Thermomix</span></summary>
      ${rangee('recevoir', 'Pour recevoir', 'Grandes tablées et plats qui se préparent à l’avance', recevoir, `${base}repas/`, 'Préparer un repas →')}
      ${rangee('desserts', 'Les desserts de Claire', 'Pour finir en douceur', desserts, `${base}?cat=dessert#carnet`)}
      ${rangee('peu', 'En quelques ingrédients', 'Cinq ingrédients ou moins', peu, `${base}?n=5#carnet`)}
      ${rangee('tmx', 'Au Thermomix', 'Les recettes faites avec le robot', tmx, `${base}?tmx=1#carnet`)}
    </details>`;
  dessinerDuJour();
  zone.querySelector('.du-jour-autre')!.addEventListener('click', () => {
    autres += 1;
    const r = hasard(`${jour}-${autres}-${Date.now()}`);
    let suivant = duJour;
    while (suivant === duJour) suivant = candidats[Math.floor(r() * candidats.length)];
    duJour = suivant;
    dessinerDuJour();
  });
  window.dispatchEvent(new CustomEvent('favoris'));
}
