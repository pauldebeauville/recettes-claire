// Fiche recette : portions, versions, favoris, partage, minuteurs et mode cuisine.
import '../styles/cuisine.css';
import { basculerFavori, lireFavoris, toast } from './favoris';
import { creerMinuteur } from './minuteurs';
import { momentDe } from './repas';
import { MULTIPLES, ajusterQuantites, enFraction, lignesAffichees, type Portions } from './quantites';
import { dateCourte, definirCourses, ecrireRepas, lireCourses, lireCuisinees, lireRepas, marquerCuisinee } from './perso';

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/`;

function initialiserVersion(v: HTMLElement) {
  const portions: Portions = JSON.parse(v.dataset.portions!);
  const sortie = v.querySelector('output')!;
  const unite = v.querySelector('.portions-unite')!;
  const [moins, plus] = v.querySelectorAll<HTMLButtonElement>('.pas');
  const avis = v.querySelector<HTMLElement>('.avis')!;
  const sansQuantite = [...v.querySelectorAll('.liste-ingredients .ingredient')].some((s) => !s.querySelector('.q'));
  let valeur = portions.mode === 'personnes' ? portions.base : 1;

  // liste de courses : les ingrédients cochés sont à acheter, rangés sous cette recette
  const article = v.closest<HTMLElement>('.recette')!;
  const no = +v.id.split('-')[1];
  const plusieurs = document.querySelectorAll('.version').length > 1;
  const cases = [...v.querySelectorAll<HTMLButtonElement>('.ajout-courses')];
  const position = (c: HTMLElement) => +c.closest<HTMLElement>('li')!.dataset.i!;
  const dans = (c: HTMLElement) => c.getAttribute('aria-pressed') === 'true';
  const entree = () => lireCourses().recettes.find((r) => r.slug === article.dataset.slug && r.version === no);
  const enregistrerCourses = () => {
    const coches = new Set(cases.filter(dans).map(position));
    definirCourses(
      {
        slug: article.dataset.slug!,
        version: no,
        titre: `${article.dataset.titre}${plusieurs ? ` (Version ${no})` : ''}`,
        url: `${location.pathname}${plusieurs ? `#version-${no}` : ''}`,
        portions: portions.mode === 'personnes' ? `pour ${sortie.textContent} ${unite.textContent}` : `recette × ${sortie.textContent}`,
        valeur,
      },
      lignesAffichees(v).filter((l) => coches.has(l.i)),
    );
  };
  const synchroniserCourses = () => {
    const dedans = new Set(entree()?.lignes.map((l) => l.i));
    cases.forEach((c) => c.setAttribute('aria-pressed', String(dedans.has(position(c)))));
  };
  cases.forEach((c) =>
    c.addEventListener('click', () => {
      const ajoute = !dans(c);
      c.setAttribute('aria-pressed', String(ajoute));
      enregistrerCourses();
      const ingredient = c.closest('li')!.querySelector('.ingredient')!.textContent!.trim();
      if (ajoute) toast(`Ajouté à votre liste de courses : ${ingredient}`);
      else
        toast(`Retiré de votre liste de courses : ${ingredient}`, {
          libelle: 'Annuler',
          action: () => {
            c.setAttribute('aria-pressed', 'true');
            enregistrerCourses();
          },
        });
    }),
  );
  v.addEventListener('courses-cases', enregistrerCourses);
  window.addEventListener('courses', synchroniserCourses);
  synchroniserCourses();
  // une recette déjà dans la liste réapparaît pour le même nombre de personnes
  const deja = entree()?.valeur;
  if (deja) valeur = deja;

  const afficher = (parUtilisateur = false) => {
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
    // les quantités de la liste de courses suivent le nombre de personnes
    if (parUtilisateur && cases.some(dans)) enregistrerCourses();
  };

  const changer = (sens: number) => {
    if (portions.mode === 'personnes') {
      valeur = Math.min(99, Math.max(portions.pas, valeur + sens * portions.pas));
    } else {
      const i = MULTIPLES.indexOf(valeur) + sens;
      valeur = MULTIPLES[Math.min(MULTIPLES.length - 1, Math.max(0, i))];
    }
    afficher(true);
  };
  moins.addEventListener('click', () => changer(-1));
  plus.addEventListener('click', () => changer(1));
  v.querySelector('.lien-retour')!.addEventListener('click', () => {
    valeur = portions.mode === 'personnes' ? portions.base : 1;
    afficher(true);
  });
  afficher();

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
    favori.querySelector('span')!.textContent = 'Favori';
  };
  majFavori();
  favori.addEventListener('click', () => {
    toast(basculerFavori(slug) ? 'Ajoutée à vos favoris' : 'Retirée de vos favoris');
    majFavori();
  });
  // déjà cuisinée, liste de courses, repas : un petit récapitulatif sous les boutons
  const cuisinee = document.getElementById('cuisinee')!;
  const courses = document.getElementById('courses')!;
  const etatPerso = document.getElementById('etat-perso')!;
  const majPerso = () => {
    const date = lireCuisinees()[slug];
    cuisinee.setAttribute('aria-pressed', String(!!date));
    cuisinee.querySelector('span')!.textContent = date ? `Cuisinée le ${dateCourte(date)}` : 'Je l’ai cuisinée';
    const dansCourses = lireCourses().recettes.some((r) => r.slug === slug);
    courses.setAttribute('aria-pressed', String(dansCourses));
    const dansRepas = lireRepas().plats.some((p) => p.slug === slug);
    const morceaux = [
      date && `Cuisinée le ${dateCourte(date)}`,
      dansCourses && `Dans votre <a href="${BASE}courses/">liste de courses</a>`,
      dansRepas && `Au menu de votre <a href="${BASE}repas/">repas</a>`,
    ].filter(Boolean);
    etatPerso.hidden = !morceaux.length;
    etatPerso.innerHTML = morceaux.join(' · ');
  };
  majPerso();
  ['cuisinees', 'courses', 'repas'].forEach((e) => window.addEventListener(e, majPerso));
  cuisinee.addEventListener('click', () => {
    const oui = !lireCuisinees()[slug];
    marquerCuisinee(slug, oui);
    toast(oui ? 'Bravo ! Recette ajoutée à celles que vous avez cuisinées' : 'Retirée des recettes cuisinées');
  });
  // « Courses » : tous les ingrédients d'un coup (ou les retire s'ils y sont déjà tous)
  courses.addEventListener('click', () => {
    const v = versionActive();
    const cases = [...v.querySelectorAll<HTMLButtonElement>('.ajout-courses')];
    const toutes = cases.every((c) => c.getAttribute('aria-pressed') === 'true');
    const avant = cases.map((c) => c.getAttribute('aria-pressed'));
    cases.forEach((c) => c.setAttribute('aria-pressed', String(!toutes)));
    v.dispatchEvent(new CustomEvent('courses-cases'));
    if (toutes)
      toast('Recette retirée de votre liste de courses', {
        libelle: 'Annuler',
        action: () => {
          cases.forEach((c, i) => c.setAttribute('aria-pressed', avant[i]!));
          v.dispatchEvent(new CustomEvent('courses-cases'));
        },
      });
    else toast('Tous les ingrédients sont dans votre liste de courses');
  });
  document.getElementById('repas')!.addEventListener('click', () => {
    const r = lireRepas();
    if (!r.plats.some((p) => p.slug === slug)) {
      r.plats.push({ slug, moment: momentDe(article.dataset.categorie ?? 'plat') });
      ecrireRepas(r);
    }
    toast('Ajoutée à votre repas');
  });
  // le menu « … » se referme après un choix ou un clic ailleurs
  const plus = document.querySelector<HTMLDetailsElement>('.plus');
  document.addEventListener('click', (e) => {
    if (plus?.open && (!plus.contains(e.target as Node) || (e.target as HTMLElement).closest('.plus-menu button'))) plus.open = false;
  });

  document.getElementById('imprimer')!.addEventListener('click', () => window.print());
  document.getElementById('imprimer-grand')!.addEventListener('click', () => {
    document.documentElement.classList.add('impression-grande');
    window.addEventListener('afterprint', () => document.documentElement.classList.remove('impression-grande'), { once: true });
    window.print();
  });
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

function initialiserMinuteursEtapes(article: HTMLElement) {
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.minuteur');
    if (!b) return;
    const n = b.closest<HTMLElement>('.etape, .cuisine-scene')?.dataset.n;
    // le nom de la recette suit le minuteur sur les autres pages
    creerMinuteur(+b.dataset.s!, `${article.dataset.titre}${n ? ` · étape ${n}` : ''}`);
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
          <button type="button" class="bouton bouton-icone" data-action="lire" aria-pressed="false" aria-label="Lire les étapes à voix haute" title="Lire à voix haute" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>
          </button>
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
    // en cuisine, les cases servent à suivre ce qui est déjà ajouté au plat
    const copie = v.querySelector('.liste-ingredients')!.cloneNode(true) as HTMLElement;
    copie.querySelectorAll('.ajout-courses, a').forEach((b) => b.remove());
    copie.querySelectorAll<HTMLElement>('.ingredient').forEach((ing) => {
      const label = document.createElement('label');
      label.innerHTML = '<input type="checkbox" />';
      ing.replaceWith(label);
      label.append(ing);
    });
    ingredients.append(copie);
    document.body.append(ecran);
    document.documentElement.classList.add('sans-defilement');
    garderEcranAllume();

    let i = 0;
    const scene = ecran.querySelector<HTMLElement>('.cuisine-scene')!;
    const suivant = ecran.querySelector<HTMLButtonElement>('[data-action="suivant"]')!;
    const precedent = ecran.querySelector<HTMLButtonElement>('[data-action="precedent"]')!;
    // lecture à voix haute, pour suivre la recette les mains dans la pâte
    const voix = 'speechSynthesis' in window ? window.speechSynthesis : null;
    const boutonLire = ecran.querySelector<HTMLButtonElement>('[data-action="lire"]')!;
    boutonLire.hidden = !voix;
    let lecture = false;
    try {
      lecture = !!voix && localStorage.getItem('recettes-claire:lecture') === '1';
    } catch {
      /* rien */
    }
    const lire = () => {
      if (!voix || !lecture) return;
      voix.cancel();
      const texte = ecran.querySelector<HTMLElement>('.cuisine-texte')!.innerText.replace(/\s+/g, ' ');
      const phrase = new SpeechSynthesisUtterance(`Étape ${i + 1}. ${texte}`);
      phrase.lang = 'fr-FR';
      phrase.rate = 0.95;
      const francaise = voix.getVoices().find((v) => v.lang.startsWith('fr'));
      if (francaise) phrase.voice = francaise;
      voix.speak(phrase);
    };
    const majLecture = () => boutonLire.setAttribute('aria-pressed', String(lecture));
    majLecture();

    const afficher = () => {
      const e = etapes[i];
      scene.dataset.n = e.n;
      ecran.querySelector('.cuisine-etape')!.textContent = `Étape ${i + 1} sur ${etapes.length}${e.section ? ` · ${e.section}` : ''}`;
      ecran.querySelector('.cuisine-texte')!.innerHTML = e.html;
      ecran.querySelector<HTMLElement>('.cuisine-progression span')!.style.width = `${((i + 1) / etapes.length) * 100}%`;
      precedent.disabled = i === 0;
      suivant.childNodes[0].textContent = i === etapes.length - 1 ? 'Terminer ' : 'Suivant ';
      lire();
    };
    const fermer = () => {
      voix?.cancel();
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
        marquerCuisinee(article.dataset.slug!, true);
        toast('Bon appétit ! Recette ajoutée à celles que vous avez cuisinées');
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
      else if (action === 'lire') {
        lecture = !lecture;
        try {
          localStorage.setItem('recettes-claire:lecture', lecture ? '1' : '0');
        } catch {
          /* rien */
        }
        majLecture();
        if (lecture) lire();
        else voix?.cancel();
      } else if (action === 'ingredients') {
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

/** « ← Le carnet » ramène à la recherche et aux filtres d'où l'on venait, au niveau de cette recette. */
function initialiserRetour(article: HTMLElement) {
  const fil = document.querySelector<HTMLAnchorElement>('.fil a');
  if (!fil) return;
  try {
    const recherche = sessionStorage.getItem('recettes-claire:retour');
    const depuis = sessionStorage.getItem('recettes-claire:depuis');
    if (recherche == null && !depuis) return;
    const base = fil.getAttribute('href')!.split(/[?#]/)[0];
    fil.href = `${base}${recherche ?? ''}#${depuis === article.dataset.slug ? `r-${depuis}` : 'carnet'}`;
  } catch {
    /* rien */
  }
}

export function initialiserRecette() {
  const article = document.querySelector<HTMLElement>('.recette')!;
  initialiserRetour(article);
  document.querySelectorAll<HTMLElement>('.version').forEach(initialiserVersion);
  initialiserOnglets();
  initialiserActions(article);
  initialiserMinuteursEtapes(article);
  initialiserCuisine(article);
}
