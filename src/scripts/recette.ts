// Fiche recette : portions, versions, favoris, partage, minuteurs et mode cuisine.
import '../styles/cuisine.css';
import { basculerFavori, lireFavoris, toast } from './favoris';
import { creerMinuteur } from './minuteurs';

type Portions = { mode: 'personnes'; base: number; max?: number; unite: string; pas: number } | { mode: 'multiple' };

const MULTIPLES = [0.5, 1, 1.5, 2, 3, 4, 5, 6];
const ESPACE_FINE = ' ';
const FRACTIONS: [number, string][] = [
  [0, ''],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
];

function enFraction(v: number, pas: number): { valeur: number; texte: string } {
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

function ajusterQuantites(racine: HTMLElement, facteur: number) {
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

function initialiserVersion(v: HTMLElement) {
  const portions: Portions = JSON.parse(v.dataset.portions!);
  const sortie = v.querySelector('output')!;
  const unite = v.querySelector('.portions-unite')!;
  const [moins, plus] = v.querySelectorAll<HTMLButtonElement>('.pas');
  const avis = v.querySelector<HTMLElement>('.avis')!;
  const sansQuantite = [...v.querySelectorAll('.liste-ingredients label span')].some((s) => !s.querySelector('.q'));
  let valeur = portions.mode === 'personnes' ? portions.base : 1;

  const afficher = () => {
    const facteur = portions.mode === 'personnes' ? valeur / portions.base : valeur;
    if (portions.mode === 'personnes') {
      sortie.textContent = String(valeur);
      unite.textContent = `${portions.unite}${valeur > 1 ? 's' : ''}`;
      moins.disabled = valeur <= portions.pas;
    } else {
      sortie.textContent = enFraction(valeur, 0.5).texte;
      moins.disabled = valeur <= MULTIPLES[0];
      plus.disabled = valeur >= MULTIPLES[MULTIPLES.length - 1];
    }
    ajusterQuantites(v, facteur);
    avis.hidden = facteur === 1;
    if (facteur !== 1) {
      const phrases = [
        portions.mode === 'personnes'
          ? `Quantités recalculées pour ${valeur} ${unite.textContent}.`
          : `Quantités multipliées par ${enFraction(valeur, 0.5).texte}.`,
        'Les quantités citées dans les étapes restent celles de la recette d’origine.',
      ];
      if (sansQuantite) phrases.push('Ajustez à votre goût les ingrédients sans quantité précise.');
      if (v.dataset.moule) phrases.push('Pensez à adapter la taille du moule et à surveiller la cuisson.');
      if (v.dataset.tmx && facteur > 1.5) phrases.push('Attention à la capacité du bol du Thermomix.');
      avis.querySelector('.avis-texte')!.innerHTML = phrases.map((p) => `<span>${p}</span>`).join('');
    }
  };

  const changer = (sens: number) => {
    if (portions.mode === 'personnes') {
      valeur = Math.min(99, Math.max(portions.pas, valeur + sens * portions.pas));
    } else {
      const i = MULTIPLES.indexOf(valeur) + sens;
      valeur = MULTIPLES[Math.min(MULTIPLES.length - 1, Math.max(0, i))];
    }
    afficher();
  };
  moins.addEventListener('click', () => changer(-1));
  plus.addEventListener('click', () => changer(1));
  v.querySelector('.lien-retour')!.addEventListener('click', () => {
    valeur = portions.mode === 'personnes' ? portions.base : 1;
    afficher();
  });
  afficher();

  // étapes : un toucher les marque comme faites
  v.querySelectorAll<HTMLElement>('.etape').forEach((e) =>
    e.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('button, a')) return;
      if (getSelection()?.toString()) return;
      e.classList.toggle('faite');
    }),
  );
}

function versionActive(): HTMLElement {
  return document.querySelector<HTMLElement>('.version:not([hidden])')!;
}

function initialiserOnglets() {
  const onglets = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  if (!onglets.length) return;
  const choisir = (o: HTMLButtonElement, memoriser = true) => {
    onglets.forEach((x) => {
      const actif = x === o;
      x.setAttribute('aria-selected', String(actif));
      x.tabIndex = actif ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')!)!.hidden = !actif;
    });
    if (memoriser) history.replaceState(null, '', `#${o.getAttribute('aria-controls')}`);
  };
  onglets.forEach((o, i) => {
    o.addEventListener('click', () => choisir(o));
    o.addEventListener('keydown', (e) => {
      const sens = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!sens) return;
      const suivant = onglets[(i + sens + onglets.length) % onglets.length];
      suivant.focus();
      choisir(suivant);
    });
  });
  const depuisAdresse = onglets.find((o) => `#${o.getAttribute('aria-controls')}` === location.hash);
  if (depuisAdresse) choisir(depuisAdresse, false);
}

function initialiserActions(article: HTMLElement) {
  const slug = article.dataset.slug!;
  const favori = document.getElementById('favori')!;
  const majFavori = () => {
    const oui = lireFavoris().includes(slug);
    favori.setAttribute('aria-pressed', String(oui));
    favori.querySelector('span')!.textContent = oui ? 'Dans mes favoris' : 'Favori';
  };
  majFavori();
  favori.addEventListener('click', () => {
    toast(basculerFavori(slug) ? 'Ajoutée à vos favoris' : 'Retirée de vos favoris');
    majFavori();
  });
  document.getElementById('imprimer')!.addEventListener('click', () => window.print());
  document.getElementById('partager')!.addEventListener('click', async () => {
    const donnees = { title: article.dataset.titre, text: `${article.dataset.titre} — une recette de Claire`, url: location.href.split('#')[0] };
    if (navigator.share) {
      try {
        await navigator.share(donnees);
      } catch {
        /* partage annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(donnees.url);
      toast('Lien copié');
    } catch {
      toast(donnees.url);
    }
  });
}

// ---------- minuteurs dans les étapes ----------

function initialiserMinuteurs() {
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.minuteur');
    if (!b) return;
    const etape = b.closest<HTMLElement>('.etape, .cuisine-scene');
    const n = etape?.dataset.n;
    creerMinuteur(+b.dataset.s!, `${n ? `Étape ${n} · ` : ''}${b.textContent!.trim()}`);
  });
}

// ---------- mode cuisine ----------

function initialiserCuisine(article: HTMLElement) {
  const bouton = document.getElementById('ouvrir-cuisine')!;
  let verrou: WakeLockSentinel | null = null;

  const garderEcranAllume = async () => {
    try {
      verrou = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      verrou = null;
    }
  };

  bouton.addEventListener('click', () => {
    const v = versionActive();
    let section = '';
    const etapes: { n: string; section: string; html: string }[] = [];
    v.querySelectorAll<HTMLElement>('.etapes > li').forEach((li) => {
      if (li.classList.contains('section')) section = li.textContent!.trim();
      else etapes.push({ n: li.dataset.n!, section, html: li.querySelector('.etape-corps')!.innerHTML });
    });
    if (!etapes.length) return;

    const ecran = document.createElement('div');
    ecran.className = 'cuisine';
    ecran.setAttribute('role', 'dialog');
    ecran.setAttribute('aria-modal', 'true');
    ecran.setAttribute('aria-label', `Mode cuisine : ${article.dataset.titre}`);
    ecran.innerHTML = `
      <header class="cuisine-tete">
        <p class="cuisine-titre"></p>
        <div class="cuisine-outils">
          <button type="button" class="bouton" data-action="ingredients" aria-expanded="false">Ingrédients</button>
          <button type="button" class="bouton bouton-icone" data-action="fermer" aria-label="Quitter le mode cuisine">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
      </header>
      <div class="cuisine-progression" aria-hidden="true"><span></span></div>
      <div class="cuisine-scene" aria-live="polite">
        <p class="kicker cuisine-etape"></p>
        <div class="cuisine-texte"></div>
      </div>
      <aside class="cuisine-ingredients" hidden></aside>
      <footer class="cuisine-pied">
        <button type="button" class="bouton" data-action="precedent">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg> Précédent
        </button>
        <button type="button" class="bouton bouton-principal" data-action="suivant">
          Suivant <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </button>
      </footer>`;
    ecran.querySelector('.cuisine-titre')!.textContent = article.dataset.titre!;
    const ingredients = ecran.querySelector<HTMLElement>('.cuisine-ingredients')!;
    const nb = v.querySelector('.portions-valeur output')!.textContent;
    const unite = v.querySelector('.portions-unite')!.textContent;
    ingredients.innerHTML = `<p class="kicker">${unite === 'fois la recette' ? `Recette × ${nb}` : `Pour ${nb} ${unite}`}</p>`;
    ingredients.append(v.querySelector('.liste-ingredients')!.cloneNode(true));
    document.body.append(ecran);
    document.documentElement.classList.add('sans-defilement');
    garderEcranAllume();

    let i = 0;
    const scene = ecran.querySelector<HTMLElement>('.cuisine-scene')!;
    const suivant = ecran.querySelector<HTMLButtonElement>('[data-action="suivant"]')!;
    const precedent = ecran.querySelector<HTMLButtonElement>('[data-action="precedent"]')!;
    const afficher = () => {
      const e = etapes[i];
      scene.dataset.n = e.n;
      ecran.querySelector('.cuisine-etape')!.textContent = `Étape ${i + 1} sur ${etapes.length}${e.section ? ` · ${e.section}` : ''}`;
      ecran.querySelector('.cuisine-texte')!.innerHTML = e.html;
      ecran.querySelector<HTMLElement>('.cuisine-progression span')!.style.width = `${((i + 1) / etapes.length) * 100}%`;
      precedent.disabled = i === 0;
      suivant.childNodes[0].textContent = i === etapes.length - 1 ? 'Terminer ' : 'Suivant ';
    };
    const fermer = () => {
      ecran.remove();
      document.documentElement.classList.remove('sans-defilement');
      document.removeEventListener('keydown', clavier);
      document.removeEventListener('visibilitychange', visibilite);
      verrou?.release().catch(() => {});
      verrou = null;
      bouton.focus();
    };
    const aller = (sens: number) => {
      if (sens > 0 && i === etapes.length - 1) {
        fermer();
        toast('Bon appétit !');
        return;
      }
      i = Math.min(etapes.length - 1, Math.max(0, i + sens));
      afficher();
    };
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        aller(1);
      } else if (e.key === 'ArrowLeft') aller(-1);
    };
    const visibilite = () => {
      if (document.visibilityState === 'visible' && !verrou) garderEcranAllume();
    };
    document.addEventListener('keydown', clavier);
    document.addEventListener('visibilitychange', visibilite);
    ecran.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'fermer') fermer();
      else if (action === 'suivant') aller(1);
      else if (action === 'precedent') aller(-1);
      else if (action === 'ingredients') {
        ingredients.hidden = !ingredients.hidden;
        ecran.querySelector('[data-action="ingredients"]')!.setAttribute('aria-expanded', String(!ingredients.hidden));
      }
    });
    // glisser du doigt pour changer d'étape
    let depart: { x: number; y: number } | null = null;
    scene.addEventListener('pointerdown', (e) => (depart = { x: e.clientX, y: e.clientY }));
    scene.addEventListener('pointerup', (e) => {
      if (!depart) return;
      const dx = e.clientX - depart.x;
      const dy = e.clientY - depart.y;
      depart = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) aller(dx < 0 ? 1 : -1);
    });
    afficher();
    suivant.focus();
  });
}

export function initialiserRecette() {
  const article = document.querySelector<HTMLElement>('.recette')!;
  document.querySelectorAll<HTMLElement>('.version').forEach(initialiserVersion);
  initialiserOnglets();
  initialiserActions(article);
  initialiserMinuteurs();
  initialiserCuisine(article);
}
