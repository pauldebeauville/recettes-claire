// Favoris gardés dans ce navigateur uniquement.
const CLE = 'recettes-claire:favoris';

export function lireFavoris(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]');
  } catch {
    return [];
  }
}

export function basculerFavori(slug: string): boolean {
  const favoris = new Set(lireFavoris());
  const ajoute = !favoris.has(slug);
  if (ajoute) favoris.add(slug);
  else favoris.delete(slug);
  try {
    localStorage.setItem(CLE, JSON.stringify([...favoris]));
  } catch {
    /* navigation privée : les favoris ne sont pas gardés */
  }
  window.dispatchEvent(new CustomEvent('favoris'));
  return ajoute;
}

let minuterieToast: number | undefined;
export function toast(message: string) {
  const el = document.querySelector<HTMLElement>('.toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(minuterieToast);
  minuterieToast = window.setTimeout(() => el.classList.remove('visible'), 2200);
}
