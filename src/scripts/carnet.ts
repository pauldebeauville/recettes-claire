// Recherche, filtres, tri et affichage du carnet (page d'accueil).
import { lireFavoris } from './favoris';

type Etat = {
  q: string;
  type: string;
  cat: Set<string>;
  ved: Set<string>;
  n: string;
  prep: string;
  cuis: string;
  tmx: boolean;
  avance: boolean;
  favoris: boolean;
  tri: string;
  vue: string;
};

type Entree = { s: string; t: string; i: string };

const MOTS_VIDES = new Set(['de', 'la', 'le', 'les', 'du', 'des', 'et', 'a', 'au', 'aux', 'en', 'd', 'l', 'un', 'une', 'avec', 'pour', 'sur']);
const SYNONYMES: Record<string, string> = { st: 'saint', ste: 'sainte', tmx: 'thermomix' };

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

const singulier = (m: string) => (m.length > 3 ? m.replace(/(s|x)$/, '') : m);

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

function trouve(jeton: string, mots: string[]): boolean {
  for (const m of mots) {
    if (m.startsWith(jeton) || singulier(m) === jeton) return true;
    if (jeton.length >= 5 && (proche(jeton, m) || (m.length > jeton.length && proche(jeton, m.slice(0, jeton.length))))) return true;
  }
  return false;
}

export function initialiserCarnet() {
  const index: Entree[] = JSON.parse(document.getElementById('index-recherche')!.textContent!);
  const mots = new Map(index.map((e) => [e.s, { t: e.t.split(' '), i: e.i.split(' ') }]));
  const fiches = [...document.querySelectorAll<HTMLLIElement>('#fiches .fiche')];
  const lignesSommaire = [...document.querySelectorAll<HTMLLIElement>('#sommaire li')];
  const champ = document.getElementById('q') as HTMLInputElement;
  const tri = document.getElementById('tri') as HTMLSelectElement;
  const panneau = document.getElementById('panneau-filtres') as HTMLDialogElement;
  const puces = [...panneau.querySelectorAll<HTMLButtonElement>('.puce[data-groupe]')];
  const titres = new Map(fiches.map((f) => [f.dataset.slug!, f.querySelector('.fiche-titre')!.textContent!.trim()]));

  const etat: Etat = lireAdresse();

  function lireAdresse(): Etat {
    const p = new URLSearchParams(location.search);
    const liste = (k: string) => new Set((p.get(k) ?? '').split(',').filter(Boolean));
    return {
      q: p.get('q') ?? '',
      type: p.get('type') ?? '',
      cat: liste('cat'),
      ved: liste('ved'),
      n: p.get('n') ?? '',
      prep: p.get('prep') ?? '',
      cuis: p.get('cuis') ?? '',
      tmx: p.has('tmx'),
      avance: p.has('avance'),
      favoris: p.has('favoris'),
      tri: p.get('tri') ?? 'carnet',
      vue: p.get('vue') ?? 'fiches',
    };
  }

  function ecrireAdresse() {
    const p = new URLSearchParams();
    if (etat.q) p.set('q', etat.q);
    if (etat.type) p.set('type', etat.type);
    if (etat.cat.size) p.set('cat', [...etat.cat].join(','));
    if (etat.ved.size) p.set('ved', [...etat.ved].join(','));
    for (const k of ['n', 'prep', 'cuis'] as const) if (etat[k]) p.set(k, etat[k]);
    for (const k of ['tmx', 'avance', 'favoris'] as const) if (etat[k]) p.set(k, '1');
    if (etat.tri !== 'carnet') p.set('tri', etat.tri);
    if (etat.vue !== 'fiches') p.set('vue', etat.vue);
    const qs = p.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  function jetons(): string[] {
    return normaliser(etat.q)
      .split(' ')
      .filter((m) => m && !MOTS_VIDES.has(m))
      .map((m) => singulier(SYNONYMES[m] ?? m));
  }

  /** Score de recherche : -1 si la recette ne correspond pas. */
  function score(slug: string, js: string[]): number {
    if (!js.length) return 0;
    const m = mots.get(slug)!;
    let s = 0;
    for (const j of js) {
      if (trouve(j, m.t)) s += 3;
      else if (trouve(j, m.i)) s += 1;
      else return -1;
    }
    return s;
  }

  const dureeOk = (v: string | undefined, max: string) => !max || (v !== '' && v !== undefined && +v <= +max);
  const nbOk = (nb: number, n: string) =>
    !n || (n === '5' ? nb <= 5 : n === '8' ? nb >= 6 && nb <= 8 : n === '12' ? nb >= 9 && nb <= 12 : nb > 12);

  function correspond(f: HTMLLIElement, sauf?: string, favoris = new Set(lireFavoris())): boolean {
    const d = f.dataset;
    if (etat.type && !d.types!.split('|').includes(etat.type)) return false;
    if (sauf !== 'cat' && etat.cat.size && !d.cats!.split('|').some((c) => etat.cat.has(c))) return false;
    if (sauf !== 'ved' && etat.ved.size && !d.veds!.split('|').some((c) => etat.ved.has(c))) return false;
    if (sauf !== 'n' && !nbOk(+d.nb!, etat.n)) return false;
    if (sauf !== 'prep' && !dureeOk(d.prep, etat.prep)) return false;
    if (sauf !== 'cuis' && !dureeOk(d.cuis, etat.cuis)) return false;
    if (sauf !== 'tmx' && etat.tmx && !d.tmx) return false;
    if (sauf !== 'avance' && etat.avance && !d.avance) return false;
    if (sauf !== 'favoris' && etat.favoris && !favoris.has(d.slug!)) return false;
    return true;
  }

  function valeurPuce(groupe: string, valeur: string): boolean {
    switch (groupe) {
      case 'cat':
        return etat.cat.has(valeur);
      case 'ved':
        return etat.ved.has(valeur);
      case 'n':
      case 'prep':
      case 'cuis':
        return etat[groupe] === valeur;
      default:
        return etat[groupe as 'tmx' | 'avance' | 'favoris'];
    }
  }

  function correspondPuce(f: HTMLLIElement, groupe: string, valeur: string, favoris: Set<string>): boolean {
    const d = f.dataset;
    switch (groupe) {
      case 'cat':
        return d.cats!.split('|').includes(valeur);
      case 'ved':
        return d.veds!.split('|').includes(valeur);
      case 'n':
        return nbOk(+d.nb!, valeur);
      case 'prep':
        return dureeOk(d.prep, valeur);
      case 'cuis':
        return dureeOk(d.cuis, valeur);
      case 'tmx':
        return !!d.tmx;
      case 'avance':
        return !!d.avance;
      default:
        return favoris.has(d.slug!);
    }
  }

  function libelleActif(groupe: string, valeur: string): string {
    const puce = puces.find((p) => p.dataset.groupe === groupe && p.dataset.valeur === valeur);
    let texte = valeur;
    if (puce) {
      const copie = puce.cloneNode(true) as HTMLElement;
      copie.querySelector('.nb')?.remove();
      texte = copie.textContent!.trim();
    }
    if (groupe === 'prep') return `Préparation : ${texte}`;
    if (groupe === 'cuis') return `Cuisson : ${texte}`;
    if (groupe === 'n') return `${texte} ingrédients`;
    return texte;
  }

  function actualiser() {
    const favoris = new Set(lireFavoris());
    const js = jetons();
    const visibles: { f: HTMLLIElement; s: number }[] = [];
    for (const f of fiches) {
      const s = correspond(f, undefined, favoris) ? score(f.dataset.slug!, js) : -1;
      f.hidden = s < 0;
      if (s >= 0) visibles.push({ f, s });
    }
    visibles.sort((a, b) => {
      if (js.length && etat.tri === 'carnet' && b.s !== a.s) return b.s - a.s;
      if (etat.tri === 'az') return titres.get(a.f.dataset.slug!)!.localeCompare(titres.get(b.f.dataset.slug!)!, 'fr', { sensitivity: 'base' });
      if (etat.tri === 'ingredients') return +a.f.dataset.nb! - +b.f.dataset.nb! || +a.f.dataset.ordre! - +b.f.dataset.ordre!;
      return +a.f.dataset.ordre! - +b.f.dataset.ordre!;
    });
    visibles.forEach((v, i) => (v.f.style.order = String(i)));

    const ok = new Set(visibles.map((v) => v.f.dataset.slug));
    lignesSommaire.forEach((l) => (l.hidden = !ok.has(l.dataset.slug)));
    document.querySelectorAll<HTMLElement>('.sommaire-lettre').forEach((s) => {
      s.hidden = !s.querySelector('li:not([hidden])');
    });

    const sommaire = etat.vue === 'sommaire';
    document.getElementById('fiches')!.hidden = sommaire;
    document.getElementById('sommaire')!.hidden = !sommaire;
    document.getElementById('vide')!.hidden = visibles.length > 0;
    document.querySelector('.nb-resultats')!.innerHTML =
      `<strong>${visibles.length}</strong> recette${visibles.length > 1 ? 's' : ''}`;

    // boutons
    champ.value !== etat.q && (champ.value = etat.q);
    tri.value = etat.tri;
    document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === etat.type)));
    document.querySelectorAll<HTMLButtonElement>('[data-vue]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.vue === etat.vue)));

    // puces du panneau, avec le nombre de recettes qu'elles donneraient
    const nbActifs = etat.cat.size + etat.ved.size + +!!etat.n + +!!etat.prep + +!!etat.cuis + +etat.tmx + +etat.avance + +etat.favoris;
    for (const p of puces) {
      const { groupe, valeur } = p.dataset as { groupe: string; valeur: string };
      const actif = valeurPuce(groupe, valeur);
      p.setAttribute('aria-pressed', String(actif));
      const nb = fiches.filter((f) => correspond(f, groupe, favoris) && score(f.dataset.slug!, js) >= 0 && correspondPuce(f, groupe, valeur, favoris)).length;
      p.querySelector('.nb')!.textContent = String(nb);
      p.disabled = !actif && nb === 0;
    }
    document.querySelector('.nb-filtres')!.textContent = nbActifs ? String(nbActifs) : '';
    document.getElementById('voir-resultats')!.textContent =
      visibles.length ? `Voir ${visibles.length} recette${visibles.length > 1 ? 's' : ''}` : 'Aucune recette';

    // filtres actifs, retirables d'un clic
    const actifs = document.querySelector('.actifs')!;
    actifs.innerHTML = '';
    const ajouter = (texte: string, retirer: () => void) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `${texte}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
      b.setAttribute('aria-label', `Retirer le filtre ${texte}`);
      b.addEventListener('click', () => {
        retirer();
        changer();
      });
      li.append(b);
      actifs.append(li);
    };
    if (etat.q) ajouter(`« ${etat.q} »`, () => (etat.q = ''));
    etat.cat.forEach((c) => ajouter(libelleActif('cat', c), () => etat.cat.delete(c)));
    etat.ved.forEach((c) => ajouter(libelleActif('ved', c), () => etat.ved.delete(c)));
    for (const k of ['n', 'prep', 'cuis'] as const) if (etat[k]) ajouter(libelleActif(k, etat[k]), () => (etat[k] = ''));
    for (const k of ['tmx', 'avance', 'favoris'] as const) if (etat[k]) ajouter(libelleActif(k, '1'), () => (etat[k] = false));
    if (etat.q || nbActifs) {
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="tout-effacer" data-effacer>Tout effacer</button>';
      actifs.append(li);
    }
  }

  function changer() {
    ecrireAdresse();
    actualiser();
  }

  function effacer() {
    Object.assign(etat, { q: '', type: '', n: '', prep: '', cuis: '', tmx: false, avance: false, favoris: false });
    etat.cat.clear();
    etat.ved.clear();
    changer();
  }

  // --- écouteurs ---
  let attente: number | undefined;
  champ.addEventListener('input', () => {
    clearTimeout(attente);
    attente = window.setTimeout(() => {
      etat.q = champ.value.trim();
      changer();
    }, 120);
  });
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      champ.blur();
      document.getElementById('carnet')!.scrollIntoView({ behavior: 'smooth' });
    }
  });
  tri.addEventListener('change', () => {
    etat.tri = tri.value;
    changer();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach((b) =>
    b.addEventListener('click', () => {
      etat.type = b.dataset.type!;
      changer();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-vue]').forEach((b) =>
    b.addEventListener('click', () => {
      etat.vue = b.dataset.vue!;
      changer();
    }),
  );
  for (const p of puces) {
    p.addEventListener('click', () => {
      const { groupe, valeur } = p.dataset as { groupe: string; valeur: string };
      if (groupe === 'cat' || groupe === 'ved') {
        const s = etat[groupe];
        s.has(valeur) ? s.delete(valeur) : s.add(valeur);
      } else if (groupe === 'n' || groupe === 'prep' || groupe === 'cuis') {
        etat[groupe] = etat[groupe] === valeur ? '' : valeur;
      } else {
        const k = groupe as 'tmx' | 'avance' | 'favoris';
        etat[k] = !etat[k];
      }
      changer();
    });
  }
  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-effacer]')) effacer();
  });
  document.getElementById('ouvrir-filtres')!.addEventListener('click', () => panneau.showModal());
  panneau.addEventListener('click', (e) => {
    if (e.target === panneau) panneau.close();
  });
  document.querySelectorAll<HTMLButtonElement>('.tuile').forEach((t) =>
    t.addEventListener('click', () => {
      etat.cat = new Set([t.dataset.categorie!]);
      etat.type = '';
      changer();
      document.getElementById('carnet')!.scrollIntoView({ behavior: 'smooth' });
    }),
  );
  window.addEventListener('favoris', actualiser);
  // le lien « Favoris » de l'en-tête, quand on est déjà sur l'accueil
  document.getElementById('lien-favoris')!.addEventListener('click', (e) => {
    e.preventDefault();
    etat.favoris = true;
    changer();
    document.getElementById('carnet')!.scrollIntoView({ behavior: 'smooth' });
  });

  actualiser();
}
