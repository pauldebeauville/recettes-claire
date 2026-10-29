// Minuteurs de cuisine : plusieurs à la fois, avec sonnerie et vibration à la fin.
import { toast } from './favoris';

let plateau: HTMLElement | null = null;
let audio: AudioContext | null = null;
const titreOrigine = document.title;

function lePlateau(): HTMLElement {
  if (!plateau) {
    plateau = document.createElement('div');
    plateau.className = 'minuteurs';
    plateau.setAttribute('aria-live', 'polite');
    document.body.append(plateau);
  }
  return plateau;
}

const mmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
};

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

export function creerMinuteur(secondes: number, nom: string) {
  // débloque le son sur iPhone : il doit être créé pendant un geste
  try {
    audio ??= new AudioContext();
    audio.resume();
  } catch {
    /* rien */
  }
  const carte = document.createElement('div');
  carte.className = 'minuteur-carte';
  carte.innerHTML = `
    <span class="m-temps"></span>
    <span class="m-nom"></span>
    <button type="button" class="m-pause" aria-label="Mettre en pause"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg></button>
    <button type="button" class="m-stop" aria-label="Arrêter le minuteur"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  carte.querySelector('.m-nom')!.textContent = nom;
  lePlateau().prepend(carte);
  toast(`Minuteur lancé : ${mmss(secondes)}`);

  let fin = Date.now() + secondes * 1000;
  let reste = secondes;
  let enPause = false;
  const temps = carte.querySelector('.m-temps')!;
  const pause = carte.querySelector<HTMLButtonElement>('.m-pause')!;

  const tic = () => {
    if (enPause) return;
    reste = Math.max(0, Math.round((fin - Date.now()) / 1000));
    temps.textContent = mmss(reste);
    if (reste === 0) {
      clearInterval(id);
      carte.classList.add('termine');
      temps.textContent = 'Terminé !';
      pause.hidden = true;
      document.title = `⏰ ${titreOrigine}`;
      sonner();
      const relance = setInterval(sonner, 4000);
      carte.dataset.relance = String(relance);
      setTimeout(() => clearInterval(relance), 30000);
    }
  };
  const id = window.setInterval(tic, 500);
  tic();

  pause.addEventListener('click', () => {
    enPause = !enPause;
    if (!enPause) fin = Date.now() + reste * 1000;
    carte.classList.toggle('en-pause', enPause);
    pause.setAttribute('aria-label', enPause ? 'Reprendre' : 'Mettre en pause');
    pause.innerHTML = enPause
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
  });
  carte.querySelector('.m-stop')!.addEventListener('click', () => {
    clearInterval(id);
    clearInterval(+(carte.dataset.relance ?? 0));
    carte.remove();
    if (!document.querySelector('.minuteur-carte.termine')) document.title = titreOrigine;
  });
}
