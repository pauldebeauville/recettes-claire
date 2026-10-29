// Petit message en bas de l'écran (« Ajouté à votre liste de courses », « Annuler »…).

let minuterieToast: number | undefined;

/** Petit message en bas de l'écran, assez longtemps pour être lu ; avec un bouton (« Annuler ») si besoin. */
export function toast(message: string, bouton?: { libelle: string; action: () => void }) {
  const el = document.querySelector<HTMLElement>('.toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('avec-bouton', !!bouton);
  if (bouton) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = bouton.libelle;
    b.addEventListener('click', () => {
      bouton.action();
      el.classList.remove('visible');
    });
    el.append(b);
  }
  // au-dessus des minuteurs en cours, pour ne pas les cacher
  const plateau = document.querySelector<HTMLElement>('.minuteurs');
  const haut = plateau?.childElementCount ? plateau.getBoundingClientRect().top : 0;
  el.style.bottom = haut ? `${innerHeight - haut + 10}px` : '';
  el.classList.add('visible');
  clearTimeout(minuterieToast);
  minuterieToast = window.setTimeout(() => el.classList.remove('visible'), bouton ? 8000 : 5000);
}
