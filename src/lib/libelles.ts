// Libellés affichés et couleurs. Les clés sont celles écrites dans les fiches YAML.

export const TYPES: Record<string, string> = {
  salé: 'Salé',
  sucré: 'Sucré',
};

export const CATEGORIES: Record<string, { label: string; pluriel: string; couleur: string }> = {
  apéritif: { label: 'Apéritif', pluriel: 'Apéritifs', couleur: 'var(--c-aperitif)' },
  entrée: { label: 'Entrée', pluriel: 'Entrées', couleur: 'var(--c-entree)' },
  plat: { label: 'Plat', pluriel: 'Plats', couleur: 'var(--c-plat)' },
  accompagnement: { label: 'Accompagnement', pluriel: 'Accompagnements', couleur: 'var(--c-accompagnement)' },
  soupe: { label: 'Soupe', pluriel: 'Soupes', couleur: 'var(--c-soupe)' },
  sauce: { label: 'Sauce', pluriel: 'Sauces & tartinades', couleur: 'var(--c-sauce)' },
  dessert: { label: 'Dessert', pluriel: 'Desserts', couleur: 'var(--c-dessert)' },
  base: { label: 'Base', pluriel: 'Bases', couleur: 'var(--c-base)' },
};

export const VEDETTES: Record<string, string> = {
  saumon: 'Saumon',
  poisson: 'Poisson',
  'fruits de mer': 'Fruits de mer',
  viande: 'Viande',
  volaille: 'Volaille & canard',
  œufs: 'Œufs',
  légumes: 'Légumes',
  fromage: 'Fromage',
  fruits: 'Fruits',
  chocolat: 'Chocolat',
};
