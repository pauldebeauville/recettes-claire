// « Dans mon frigo, j'ai… » : quelques ingrédients, et le carnet propose une recette qui les utilise.
import { MOTS_VIDES, existe, normaliser, singulier, trouve } from './recherche';

type Entree = { s: string; t: string; i: string };
type Fiche = { s: string; u: string; t: string; c: string; k: string; n: number };

const CLE = 'recettes-claire:frigo';
const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function lire(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]');
  } catch {
    return [];
  }
}

function garder(ingredients: string[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(ingredients));
  } catch {
    /* rien */
  }
}

export function initialiserFrigo(base: string) {
  const zone = document.getElementById('frigo');
  if (!zone) return;
  const index: Entree[] = JSON.parse(document.getElementById('index-recherche')!.textContent!);
  const fiches = new Map<string, Fiche>(
    (JSON.parse(document.getElementById('donnees-frigo')!.textContent!) as Fiche[]).map((f) => [f.s, f]),
  );
  const mots = index.map((e) => ({ s: e.s, titre: e.t.split(' '), mots: `${e.t} ${e.i}`.split(' ') }));
  const vocabulaire = [...new Set(mots.flatMap((r) => r.mots))];
  let ingredients = lire();

  const champ = zone.querySelector<HTMLInputElement>('input')!;
  const puces = zone.querySelector<HTMLElement>('.frigo-puces')!;
  const resultats = zone.querySelector<HTMLElement>('.frigo-resultats')!;

  /** Un ingrédient (« crème fraîche ») est dans la recette si chacun de ses mots y est. */
  const utilise = (ingredient: string, m: string[]) =>
    normaliser(ingredient)
      .split(' ')
      .filter((x) => x && !MOTS_VIDES.has(x))
      .every((x) => trouve(singulier(x), m, !existe(singulier(x), vocabulaire)));

  const chercher = () => {
    puces.innerHTML = ingredients
      .map((x, i) => `<li><span>${echapper(x)}</span><button type="button" data-retirer="${i}" aria-label="Retirer ${echapper(x)}">×</button></li>`)
      .join('');
    zone.classList.toggle('a-des-ingredients', ingredients.length > 0);
    if (!ingredients.length) {
      resultats.hidden = true;
      return;
    }
    const trouvees = mots
      .map((r) => {
        const avec = ingredients.filter((x) => utilise(x, r.mots));
        return { f: fiches.get(r.s)!, avec, vedette: avec.filter((x) => utilise(x, r.titre)).length };
      })
      .filter((r) => r.f && r.avec.length)
      // d'abord celles qui utilisent le plus de vos ingrédients, puis celles dont c'est l'ingrédient principal, puis les plus simples
      .sort(
        (a, b) =>
          b.avec.length - a.avec.length || b.vedette - a.vedette || b.avec.length / b.f.n - a.avec.length / a.f.n || a.f.n - b.f.n,
      );
    resultats.hidden = false;
    if (!trouvees.length) {
      resultats.innerHTML = `<p class="frigo-rien">Aucune recette du carnet avec ${ingredients.length > 1 ? 'ces ingrédients' : 'cet ingrédient'}. Essayez un autre mot, ou retirez-en un.</p>`;
      return;
    }
    const [meilleure, ...autres] = trouvees;
    const tous = trouvees.filter((r) => r.avec.length === ingredients.length).length;
    const ligne = (r: (typeof trouvees)[number]) =>
      `${r.avec.length === ingredients.length ? (ingredients.length > 1 ? 'Tous vos ingrédients' : 'Avec votre ingrédient') : `${r.avec.length} sur ${ingredients.length} : ${r.avec.map(echapper).join(', ')}`} · ${r.f.n} ingrédients en tout`;
    resultats.innerHTML = `
      <a class="frigo-idee" href="${meilleure.f.u}" style="--teinte:${meilleure.f.k}">
        <span class="kicker">Notre idée · ${echapper(meilleure.f.c)}</span>
        <span class="frigo-idee-titre">${echapper(meilleure.f.t)}</span>
        <span class="frigo-idee-meta">${ligne(meilleure)}</span>
      </a>
      ${
        autres.length
          ? `<ul class="frigo-autres">${autres
              .slice(0, 5)
              .map((r) => `<li><a href="${r.f.u}"><span>${echapper(r.f.t)}</span><small>${ligne(r)}</small></a></li>`)
              .join('')}</ul>`
          : ''
      }
      ${
        tous > 1
          ? `<a class="frigo-tout" href="${base}?q=${encodeURIComponent(ingredients.join(' '))}#carnet">Voir les ${tous} recettes avec tous vos ingrédients →</a>`
          : ''
      }`;
  };

  const ajouter = (texte: string) => {
    const nouveaux = texte
      .split(/,|;|\bet\b|\n/)
      .map((x) => x.trim())
      .filter((x) => x.length > 1 && !ingredients.some((y) => normaliser(y) === normaliser(x)));
    if (!nouveaux.length) return;
    ingredients = [...ingredients, ...nouveaux].slice(0, 8);
    garder(ingredients);
    champ.value = '';
    chercher();
  };

  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      ajouter(champ.value);
    } else if (e.key === 'Backspace' && !champ.value && ingredients.length) {
      ingredients = ingredients.slice(0, -1);
      garder(ingredients);
      chercher();
    }
  });
  // choix dans les suggestions du navigateur
  champ.addEventListener('change', () => champ.value.trim() && ajouter(champ.value));
  zone.querySelector('.frigo-chercher')!.addEventListener('click', () => {
    ajouter(champ.value);
    if (!ingredients.length) champ.focus();
  });
  zone.querySelector('.frigo-vider')!.addEventListener('click', () => {
    ingredients = [];
    garder(ingredients);
    chercher();
    champ.focus();
  });
  puces.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-retirer]');
    if (!b) return;
    ingredients.splice(+b.dataset.retirer!, 1);
    garder(ingredients);
    chercher();
  });
  chercher();
}
