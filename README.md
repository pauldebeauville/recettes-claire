# Les recettes de Claire

Le carnet de recettes de Claire en site web : 155 recettes salées et sucrées, reprises mot pour mot de ses deux carnets (PDF).
Le site est hébergé gratuitement sur GitHub Pages et masqué des moteurs de recherche.

Sur le site, on peut :

- chercher une recette ou plusieurs ingrédients à la fois (« saumon avocat »), même avec une faute de frappe ;
- filtrer par salé / sucré, catégorie (apéritif, entrée, plat…), ingrédient vedette, nombre d’ingrédients, temps indiqués, Thermomix, recettes à préparer à l’avance, favoris ;
- ajuster les quantités au nombre de personnes (fractions, accords « 1 avocat → 2 avocats », quantités « par personne » laissées telles quelles) ;
- cocher les ingrédients et les étapes, lancer un minuteur en touchant une durée (« 20 minutes ») ;
- passer en **mode cuisine** : une étape à la fois, en grand, écran qui reste allumé ;
- imprimer une fiche propre, partager un lien, garder ses favoris ;
- l’installer sur l’écran d’accueil du téléphone et le consulter sans connexion.

## Ajouter une recette

Tout se fait sur github.com, sans rien installer.

1. Ouvrez le dossier `src/content/recettes` du dépôt.
2. Cliquez sur **Add file → Create new file**.
3. Nommez le fichier avec le titre en minuscules, sans accents ni espaces, terminé par `.yaml` : par exemple `tarte-aux-pommes.yaml`. Ce nom devient l’adresse de la page.
4. Collez ce modèle, remplacez le contenu, puis cliquez sur **Commit changes**.

```yaml
titre: Tarte aux pommes
type: sucré                      # salé ou sucré
categories: [dessert]            # apéritif, entrée, plat, accompagnement, soupe, sauce, dessert, base
vedettes: [fruits]               # facultatif : saumon, poisson, fruits de mer, viande, volaille,
                                 # œufs, légumes, fromage, fruits, chocolat
portions: Pour 6 personnes
temps:                           # facultatif
  - label: Préparation
    valeur: 20 minutes
  - label: Cuisson
    valeur: 35 minutes
ingredients:
  - 1 pâte brisée
  - groupe: Pour la garniture    # un sous-titre dans la liste
  - 4 pommes
  - 50 g de sucre
  - Cannelle
preparation:
  - Préchauffez le four à 180°C.
  - titre: Garniture             # une étape avec un titre et plusieurs lignes
    texte:
      - Épluchez les pommes et coupez-les en lamelles.
      - Disposez-les sur la pâte.
  - Faites cuire 35 minutes.
notes:                           # facultatif
  - titre: Astuce
    texte:
      - Servez tiède avec une boule de glace vanille.
```

Le site se met à jour tout seul en deux minutes environ. Si une fiche est mal remplie (il manque les ingrédients, une catégorie inconnue…), la mise à jour s’arrête et l’onglet **Actions** du dépôt indique ce qui ne va pas, en français. Le site en ligne reste alors inchangé.

Quelques règles pour que tout fonctionne bien :

- **Quantités** : écrivez-les en chiffres (`200 g de farine`, `Farine : 200 g`, `½ citron`, `1 à 2 avocats`). Elles seront recalculées selon le nombre de personnes. Ce qui est écrit « par personne » ou « chacune » ne change pas.
- **Portions** : `Pour 4 personnes`, `Pour 4 à 6 personnes` ou `Pour environ 24 bouchées`. Sans portions, le site propose « × ½, × 2… » à la place.
- **Durées** : dans les étapes, `20 minutes`, `1 heure` ou `1h20` deviennent des minuteurs.
- **Parties de recette** : `- section: Préparation de la crème` dans la préparation commence une nouvelle partie (la numérotation repart à 1).
- **Deux versions d’une même recette** : regardez `chili-con-carne.yaml` pour l’exemple (`versions:` avec `nom: Version 1`, `nom: Version 2`).

Pour **modifier** une recette, ouvrez son fichier dans `src/content/recettes` et cliquez sur le crayon.

## Voir le site sur son ordinateur

Il faut [Node.js](https://nodejs.org) (version 22.23 ou plus récente).

```bash
npm install
npm run dev
```

Le site s’ouvre sur http://localhost:4321.

## Mise en ligne (une seule fois)

1. Créez un dépôt sur GitHub (par exemple `recettes-claire`) et envoyez-y ce dossier.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. La première publication démarre seule. Le site est ensuite à l’adresse `https://<votre-compte>.github.io/recettes-claire/`.

## Confidentialité

GitHub Pages est gratuit mais public : toute personne qui a le lien peut voir le site. Les pages demandent aux moteurs de recherche de ne pas les indexer : on ne trouve donc pas le site par Google. Les favoris sont gardés dans le navigateur de chacun.

## Organisation du dépôt

| Dossier ou fichier | Rôle |
| --- | --- |
| `src/content/recettes/` | une fiche YAML par recette |
| `src/content.config.ts` | les règles que chaque fiche doit respecter |
| `src/lib/libelles.ts` | noms et couleurs des catégories et ingrédients vedettes |
| `src/pages/` | l’accueil, la page d’une recette, le mode hors connexion |
| `src/scripts/` | recherche, filtres, portions, minuteurs, mode cuisine |
| `src/styles/` | apparence (clair et sombre, impression) |
| `RELECTURE.md` | les points à relire après la reprise des carnets |
