// Le carnet sur l'accueil : le sommaire (chapitres et frigo), puis la liste d'un chapitre, de toutes les recettes ou d'une recherche.
import { toast } from './toast';
import { lireCuisinees } from './perso';
import { MOTS_VIDES, SYNONYMES, existe, normaliser, singulier, trouve } from './recherche';

type Etat = {
  q: string;
  cat: string; // un chapitre
  tout: boolean; // « Toutes les recettes »
  n: string;
  tmx: boolean;
  avance: boolean;
  cuite: string; // '' | 'oui' | 'non'
  selection: Set<string>; // recettes envoyées par quelqu'un (?selection=slug,slug)
};

type Entree = { s: string; t: string; i: string };

const FILTRES = ['n', 'tmx', 'avance', 'cuite'] as const;

export function initialiserCarnet() {
  const index: Entree[] = JSON.parse(document.getElementById('index-recherche')!.textContent!);
  const mots = new Map(index.map((e) => [e.s, { t: e.t.split(' '), i: e.i.split(' ') }]));
  const fiches = [...document.querySelectorAll<HTMLLIElement>('#fiches .fiche')];
  const champ = document.getElementById('q') as HTMLInputElement;
  const panneau = document.getElementById('panneau-filtres') as HTMLDialogElement;
  const puces = [...panneau.querySelectorAll<HTMLButtonElement>('.puce[data-groupe]')];
  const chapitres = new Map(
    [...document.querySelectorAll<HTMLElement>('.tuile[data-categorie]')].map((t) => [t.dataset.categorie!, t.querySelector('.tuile-nom')!.textContent!.trim()]),
  );

  const etat: Etat = lireAdresse();
  let cuites = new Set<string>();
  // vrai quand on a quitté le sommaire depuis cette page : le retour en arrière y ramène
  let empile = false;

  function lireAdresse(): Etat {
    const p = new URLSearchParams(location.search);
    return {
      q: p.get('q') ?? '',
      cat: p.get('cat') ?? '',
      tout: p.has('tout'),
      n: p.get('n') ?? '',
      tmx: p.has('tmx'),
      avance: p.has('avance'),
      cuite: p.get('cuite') ?? '',
      selection: new Set((p.get('selection') ?? '').split(',').filter(Boolean)),
    };
  }

  const nbFiltres = () => +!!etat.n + +etat.tmx + +etat.avance + +!!etat.cuite;
  const auSommaire = () => !etat.q && !etat.cat && !etat.tout && !etat.selection.size && !nbFiltres();

  function adresse(): string {
    const p = new URLSearchParams();
    if (etat.q) p.set('q', etat.q);
    if (etat.cat) p.set('cat', etat.cat);
    if (etat.tout) p.set('tout', '1');
    if (etat.selection.size) p.set('selection', [...etat.selection].join(','));
    if (etat.n) p.set('n', etat.n);
    if (etat.cuite) p.set('cuite', etat.cuite);
    if (etat.tmx) p.set('tmx', '1');
    if (etat.avance) p.set('avance', '1');
    const qs = p.toString();
    return `${location.pathname}${qs ? `?${qs}` : ''}`;
  }

  /** La recette ouverte saura revenir à cette liste. */
  function memoriserRetour() {
    try {
      sessionStorage.setItem('recettes-claire:retour', location.search);
    } catch {
      /* rien */
    }
  }

  const vocabulaire = [...new Set([...mots.values()].flatMap((m) => [...m.t, ...m.i]))];
  const approx = new Map<string, boolean>();
  const tolerer = (j: string) => {
    if (!approx.has(j)) approx.set(j, !existe(j, vocabulaire));
    return approx.get(j)!;
  };

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
      const t = tolerer(j);
      if (trouve(j, m.t, t)) s += 3;
      else if (trouve(j, m.i, t)) s += 1;
      else return -1;
    }
    return s;
  }

  const nbOk = (nb: number, n: string) =>
    !n || (n === '5' ? nb <= 5 : n === '8' ? nb >= 6 && nb <= 8 : n === '12' ? nb >= 9 && nb <= 12 : nb > 12);

  function correspond(f: HTMLLIElement, sauf?: string): boolean {
    const d = f.dataset;
    if (etat.selection.size && !etat.selection.has(d.slug!)) return false;
    if (etat.cat && !d.cats!.split('|').includes(etat.cat)) return false;
    if (sauf !== 'n' && !nbOk(+d.nb!, etat.n)) return false;
    if (sauf !== 'tmx' && etat.tmx && !d.tmx) return false;
    if (sauf !== 'avance' && etat.avance && !d.avance) return false;
    if (sauf !== 'cuite' && etat.cuite && (etat.cuite === 'oui') !== cuites.has(d.slug!)) return false;
    return true;
  }

  const valeurPuce = (groupe: string, valeur: string) =>
    groupe === 'n' || groupe === 'cuite' ? etat[groupe] === valeur : etat[groupe as 'tmx' | 'avance'];

  function correspondPuce(f: HTMLLIElement, groupe: string, valeur: string): boolean {
    const d = f.dataset;
    if (groupe === 'n') return nbOk(+d.nb!, valeur);
    if (groupe === 'cuite') return (valeur === 'oui') === cuites.has(d.slug!);
    return !!d[groupe as 'tmx' | 'avance'];
  }

  function libellePuce(groupe: string, valeur: string): string {
    const puce = puces.find((p) => p.dataset.groupe === groupe && p.dataset.valeur === valeur)!;
    const copie = puce.cloneNode(true) as HTMLElement;
    copie.querySelector('.nb')?.remove();
    const texte = copie.textContent!.trim();
    return groupe === 'n' ? `${texte} ingrédients` : texte;
  }

  function actualiser() {
    cuites = new Set(Object.keys(lireCuisinees()));
    const sommaire = auSommaire();
    document.getElementById('sommaire-accueil')!.hidden = !sommaire;
    document.getElementById('liste')!.hidden = sommaire;
    champ.value !== etat.q && (champ.value = etat.q);

    const js = jetons();
    const visibles: { f: HTMLLIElement; s: number }[] = [];
    for (const f of fiches) {
      const s = correspond(f) ? score(f.dataset.slug!, js) : -1;
      f.hidden = s < 0;
      if (s >= 0) visibles.push({ f, s });
    }
    // les meilleures réponses d'abord quand on cherche, sinon l'ordre alphabétique
    visibles.sort((a, b) => b.s - a.s || +a.f.dataset.ordre! - +b.f.dataset.ordre!);
    visibles.forEach((v, i) => (v.f.style.order = String(i)));

    document.getElementById('titre-liste')!.textContent = etat.selection.size
      ? 'Une sélection pour vous'
      : etat.cat
        ? (chapitres.get(etat.cat) ?? 'Recettes')
        : etat.q
          ? 'Votre recherche'
          : 'Toutes les recettes';
    document.querySelector('.nb-resultats')!.innerHTML = `<strong>${visibles.length}</strong> recette${visibles.length > 1 ? 's' : ''}`;
    document.getElementById('vide')!.hidden = visibles.length > 0;
    document.getElementById('partager-selection')!.hidden = !(etat.q || nbFiltres()) || visibles.length === 0 || visibles.length > 40;

    // puces du panneau, avec le nombre de recettes qu'elles donneraient
    for (const p of puces) {
      const { groupe, valeur } = p.dataset as { groupe: string; valeur: string };
      const actif = valeurPuce(groupe, valeur);
      p.setAttribute('aria-pressed', String(actif));
      const nb = fiches.filter((f) => correspond(f, groupe) && score(f.dataset.slug!, js) >= 0 && correspondPuce(f, groupe, valeur)).length;
      p.querySelector('.nb')!.textContent = String(nb);
      p.disabled = !actif && nb === 0;
    }
    document.querySelector('.nb-filtres')!.textContent = nbFiltres() ? String(nbFiltres()) : '';
    document.getElementById('voir-resultats')!.textContent = visibles.length
      ? `Voir ${visibles.length} recette${visibles.length > 1 ? 's' : ''}`
      : 'Aucune recette';

    // recherche et filtres en cours, retirables d'un geste
    const actifs = document.querySelector('.actifs')!;
    actifs.innerHTML = '';
    const ajouter = (texte: string, retirer: () => void) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `${texte}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
      b.setAttribute('aria-label', `Retirer ${texte}`);
      b.addEventListener('click', () => {
        retirer();
        changer();
      });
      li.append(b);
      actifs.append(li);
    };
    if (etat.q) ajouter(`« ${etat.q} »`, () => (etat.q = ''));
    if (etat.selection.size) ajouter(`Sélection reçue (${etat.selection.size})`, () => etat.selection.clear());
    if (etat.n) ajouter(libellePuce('n', etat.n), () => (etat.n = ''));
    if (etat.cuite) ajouter(libellePuce('cuite', etat.cuite), () => (etat.cuite = ''));
    if (etat.tmx) ajouter(libellePuce('tmx', '1'), () => (etat.tmx = false));
    if (etat.avance) ajouter(libellePuce('avance', '1'), () => (etat.avance = false));
  }

  function changer() {
    const url = adresse();
    if (url !== `${location.pathname}${location.search}`) {
      if (!auSommaire() && !location.search) {
        // du sommaire vers une liste : le geste « retour » ramènera au sommaire
        history.pushState(null, '', url);
        empile = true;
      } else if (auSommaire() && empile) {
        empile = false;
        history.back();
      } else history.replaceState(null, '', url);
    }
    memoriserRetour();
    actualiser();
  }

  function revenirAuSommaire() {
    Object.assign(etat, { q: '', cat: '', tout: false, n: '', cuite: '', tmx: false, avance: false });
    etat.selection.clear();
    changer();
    document.getElementById('carnet')!.scrollIntoView();
  }

  const montrerListe = () => document.getElementById('carnet')!.scrollIntoView({ behavior: 'smooth' });

  // --- écouteurs ---
  let attente: number | undefined;
  champ.addEventListener('input', () => {
    clearTimeout(attente);
    attente = window.setTimeout(() => {
      const avant = etat.q;
      etat.q = champ.value.trim();
      // une recherche porte sur tout le carnet, pas seulement sur le chapitre ouvert
      if (!avant && etat.q) etat.cat = '';
      changer();
    }, 150);
  });
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      champ.blur();
      montrerListe();
    }
  });
  for (const p of puces) {
    p.addEventListener('click', () => {
      const { groupe, valeur } = p.dataset as { groupe: string; valeur: string };
      if (groupe === 'n' || groupe === 'cuite') etat[groupe] = etat[groupe] === valeur ? '' : valeur;
      else etat[groupe as 'tmx' | 'avance'] = !etat[groupe as 'tmx' | 'avance'];
      changer();
    });
  }
  document.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    if (cible.closest('[data-effacer]')) revenirAuSommaire();
    if (cible.closest('[data-effacer-filtres]')) {
      Object.assign(etat, { n: '', cuite: '', tmx: false, avance: false });
      changer();
    }
  });
  document.getElementById('ouvrir-filtres')!.addEventListener('click', () => panneau.showModal());
  panneau.addEventListener('click', (e) => {
    if (e.target === panneau) panneau.close();
  });
  panneau.addEventListener('close', () => !auSommaire() && montrerListe());
  document.querySelectorAll<HTMLButtonElement>('.tuile').forEach((t) =>
    t.addEventListener('click', () => {
      if (t.dataset.categorie) etat.cat = t.dataset.categorie;
      else etat.tout = true;
      changer();
      montrerListe();
    }),
  );
  // le geste « retour » de l'iPhone, depuis un chapitre
  window.addEventListener('popstate', () => {
    Object.assign(etat, lireAdresse());
    empile = false;
    memoriserRetour();
    actualiser();
  });
  window.addEventListener('cuisinees', actualiser);

  document.getElementById('partager-selection')!.addEventListener('click', async () => {
    const slugs = fiches.filter((f) => !f.hidden).map((f) => f.dataset.slug!);
    const url = `${location.origin}${location.pathname}?selection=${slugs.join(',')}#carnet`;
    const donnees = { title: 'Une sélection de recettes de Claire', text: `${slugs.length} recette${slugs.length > 1 ? 's' : ''} du carnet de Claire`, url };
    if (navigator.share) {
      try {
        await navigator.share(donnees);
      } catch {
        /* annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien de la sélection copié');
    } catch {
      toast(url);
    }
  });

  document.addEventListener('click', (e) => {
    const lien = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="/recettes/"]');
    const fiche = lien?.closest<HTMLElement>('[data-slug]');
    if (!fiche) return;
    try {
      sessionStorage.setItem('recettes-claire:depuis', fiche.dataset.slug!);
    } catch {
      /* rien */
    }
  });

  memoriserRetour();
  actualiser();
}
