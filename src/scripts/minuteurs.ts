// Minuteurs de cuisine, disponibles sur toutes les pages.
// Ils sont gardés dans le navigateur : ils continuent de tourner quand on change de page,
// et on peut les mettre en pause, les relancer ou les arrêter depuis n'importe où.
import '../styles/minuteur.css';
import { toast } from './favoris';

type Minuteur = {
  id: string;
  nom: string;
  fin: number | null; // heure de fin (ms) quand il tourne, null en pause
  reste: number; // secondes restantes, au moment de la pause
  sonne?: boolean; // déjà sonné une fois
};

const CLE = 'recettes-claire:minuteurs';
const CLE_REGLAGE = 'recettes-claire:minuteur-reglage';
const RACCOURCIS = [1, 3, 5, 10, 15, 20, 30, 45, 60];
const ICONES = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
  lecture: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

let liste: Minuteur[] = [];
let plateau: HTMLElement;
let panneau: HTMLDialogElement | null = null;
let audio: AudioContext | null = null;
let relance: number | undefined;
let pret = false;
const titreOrigine = document.title;

function lire(): Minuteur[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]');
  } catch {
    return [];
  }
}

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    /* navigation privée : les minuteurs restent sur cette page */
  }
  dessiner();
}

const restant = (m: Minuteur) => (m.fin == null ? m.reste : Math.max(0, Math.ceil((m.fin - Date.now()) / 1000)));

const horloge = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

const duree = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}` : `${min} min`;

function debloquerSon() {
  try {
    audio ??= new AudioContext();
    audio.resume();
  } catch {
    /* pas de son disponible */
  }
}

function sonner() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (let k = 0; k < 3; k++) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + k * 0.45);
      g.gain.exponentialRampToValueAtTime(0.35, t + k * 0.45 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.45 + 0.3);
      o.connect(g).connect(audio.destination);
      o.start(t + k * 0.45);
      o.stop(t + k * 0.45 + 0.32);
    }
  } catch {
    /* pas de son disponible */
  }
  navigator.vibrate?.([300, 150, 300, 150, 300]);
}

// ---------- actions ----------

export function creerMinuteur(secondes: number, nom: string) {
  debloquerSon();
  liste.unshift({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nom, fin: Date.now() + secondes * 1000, reste: secondes });
  enregistrer();
  toast(`Minuteur lancé : ${horloge(secondes)}`);
}

function agir(id: string, action: string) {
  const m = liste.find((x) => x.id === id);
  if (!m) return;
  debloquerSon();
  if (action === 'stop') liste = liste.filter((x) => x !== m);
  else if (action === 'pause' && m.fin != null) {
    m.reste = restant(m);
    m.fin = null;
  } else if (action === 'lecture' && m.fin == null) m.fin = Date.now() + m.reste * 1000;
  else if (action === 'plus') {
    if (restant(m) === 0) {
      m.fin = Date.now() + 60_000;
      m.sonne = false;
    } else if (m.fin != null) m.fin += 60_000;
    else m.reste += 60;
  }
  enregistrer();
}

// ---------- affichage ----------

function carte(m: Minuteur): string {
  const fini = restant(m) === 0;
  const pause = m.fin == null && !fini;
  return `
    <div class="minuteur-carte${fini ? ' termine' : ''}${pause ? ' en-pause' : ''}" data-id="${m.id}">
      <span class="m-temps">${fini ? 'Terminé !' : horloge(restant(m))}</span>
      <span class="m-nom"></span>
      <button type="button" class="m-plus" data-action="plus" aria-label="Ajouter une minute">+1</button>
      ${fini ? '' : `<button type="button" data-action="${pause ? 'lecture' : 'pause'}" aria-label="${pause ? 'Reprendre' : 'Mettre en pause'}">${pause ? ICONES.lecture : ICONES.pause}</button>`}
      <button type="button" data-action="stop" aria-label="Arrêter le minuteur">${ICONES.stop}</button>
    </div>`;
}

function rendre() {
  plateau.innerHTML = liste.map(carte).join('');
  plateau.querySelectorAll<HTMLElement>('.minuteur-carte').forEach((el, i) => {
    el.querySelector('.m-nom')!.textContent = liste[i].nom;
  });
  if (panneau?.open) dessinerEnCours();
}

function dessiner() {
  rendre();
  tic();
}

function tic() {
  let prochain: Minuteur | null = null;
  let sonnerie = false;
  let aRedessiner = false;
  for (const m of liste) {
    const s = restant(m);
    const el = plateau.querySelector<HTMLElement>(`[data-id="${m.id}"]`);
    if (s === 0 && !m.sonne && m.fin != null) {
      m.sonne = true;
      sonnerie = true;
    }
    if (el) {
      const fini = s === 0;
      if (fini !== el.classList.contains('termine')) aRedessiner = true;
      else el.querySelector('.m-temps')!.textContent = fini ? 'Terminé !' : horloge(s);
    }
    if (m.fin != null && s > 0 && (!prochain || s < restant(prochain))) prochain = m;
  }
  if (aRedessiner) rendre();
  if (sonnerie) {
    try {
      localStorage.setItem(CLE, JSON.stringify(liste));
    } catch {
      /* rien */
    }
    sonner();
    clearInterval(relance);
    let fois = 0;
    relance = window.setInterval(() => {
      if (!liste.some((m) => restant(m) === 0) || ++fois > 7) return clearInterval(relance);
      sonner();
    }, 4000);
  }
  const termines = liste.filter((m) => restant(m) === 0).length;
  const badge = document.querySelector<HTMLElement>('.minuteur-badge');
  if (badge) {
    badge.textContent = termines ? 'Terminé' : prochain ? horloge(restant(prochain)) : '';
    badge.classList.toggle('termine', termines > 0);
  }
  document.title = termines ? `⏰ ${titreOrigine}` : titreOrigine;
  if (panneau?.open) {
    panneau.querySelectorAll<HTMLElement>('[data-id] .m-temps').forEach((t) => {
      const m = liste.find((x) => x.id === t.closest<HTMLElement>('[data-id]')!.dataset.id);
      if (m) t.textContent = restant(m) === 0 ? 'Terminé !' : horloge(restant(m));
    });
  }
}

// ---------- panneau « Minuteur » ----------

function lireReglage(): number {
  try {
    return Math.max(1, +(localStorage.getItem(CLE_REGLAGE) ?? 10) || 10);
  } catch {
    return 10;
  }
}

function ouvrirPanneau() {
  if (!panneau) {
    panneau = document.createElement('dialog');
    panneau.className = 'panneau-minuteur';
    panneau.setAttribute('aria-labelledby', 'titre-minuteur');
    panneau.innerHTML = `
      <form method="dialog" class="pm-contenu">
        <header class="pm-tete">
          <h2 id="titre-minuteur">Minuteur</h2>
          <button class="bouton bouton-icone" value="fermer" aria-label="Fermer">${ICONES.stop}</button>
        </header>
        <div class="pm-reglage">
          <button type="button" class="pas" data-ajuste="-1" aria-label="Une minute de moins"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button>
          <output class="pm-valeur" aria-live="polite"></output>
          <button type="button" class="pas" data-ajuste="1" aria-label="Une minute de plus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg></button>
        </div>
        <div class="pm-raccourcis">${RACCOURCIS.map((n) => `<button type="button" class="puce" data-min="${n}">${duree(n)}</button>`).join('')}</div>
        <label class="pm-nom">
          <span>Pour quoi ? <em>(facultatif)</em></span>
          <input type="text" maxlength="40" placeholder="Ex. : le gâteau au four" />
        </label>
        <button type="button" class="bouton bouton-principal pm-lancer">Lancer le minuteur</button>
        <section class="pm-en-cours" aria-label="Minuteurs en cours"></section>
      </form>`;
    document.body.append(panneau);
    let minutes = lireReglage();
    const valeur = panneau.querySelector('.pm-valeur')!;
    const montrer = () => {
      valeur.textContent = duree(minutes);
      panneau!.querySelectorAll<HTMLButtonElement>('[data-min]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.min! === minutes)));
    };
    panneau.addEventListener('click', (e) => {
      const cible = e.target as HTMLElement;
      if (cible === panneau) return panneau!.close();
      const ajuste = cible.closest<HTMLElement>('[data-ajuste]');
      const raccourci = cible.closest<HTMLElement>('[data-min]');
      const action = cible.closest<HTMLElement>('[data-action]');
      if (ajuste) minutes = Math.min(600, Math.max(1, minutes + +ajuste.dataset.ajuste!));
      if (raccourci) minutes = +raccourci.dataset.min!;
      if (ajuste || raccourci) montrer();
      if (action) agir(action.closest<HTMLElement>('[data-id]')!.dataset.id!, action.dataset.action!);
      if (cible.closest('.pm-lancer')) {
        const champ = panneau!.querySelector('input')!;
        creerMinuteur(minutes * 60, champ.value.trim() || `Minuteur ${duree(minutes)}`);
        try {
          localStorage.setItem(CLE_REGLAGE, String(minutes));
        } catch {
          /* rien */
        }
        champ.value = '';
        panneau!.close();
      }
    });
    montrer();
  }
  dessinerEnCours();
  panneau.showModal();
}

function dessinerEnCours() {
  const zone = panneau!.querySelector<HTMLElement>('.pm-en-cours')!;
  zone.innerHTML = liste.length ? `<h3>En cours</h3>${liste.map(carte).join('')}` : '';
  zone.querySelectorAll<HTMLElement>('.minuteur-carte').forEach((el, i) => {
    el.querySelector('.m-nom')!.textContent = liste[i].nom;
  });
}

export function initialiserMinuteurs() {
  if (pret) return;
  pret = true;
  liste = lire();
  plateau = document.createElement('div');
  plateau.className = 'minuteurs';
  plateau.setAttribute('aria-live', 'polite');
  plateau.setAttribute('aria-label', 'Minuteurs');
  document.body.append(plateau);
  plateau.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (action) agir(action.closest<HTMLElement>('[data-id]')!.dataset.id!, action.dataset.action!);
  });
  document.getElementById('ouvrir-minuteur')?.addEventListener('click', ouvrirPanneau);
  // un minuteur lancé ou arrêté dans un autre onglet
  window.addEventListener('storage', (e) => {
    if (e.key === CLE) {
      liste = lire();
      dessiner();
    }
  });
  // le son ne peut démarrer qu'après un geste : on le prépare au premier toucher
  document.addEventListener('pointerdown', debloquerSon, { once: true });
  dessiner();
  window.setInterval(tic, 500);
}
