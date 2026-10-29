# Les 1000 et 1 recettes de Claire

Le carnet de recettes de Claire en site web : 155 recettes salées et sucrées, reprises mot pour mot de ses deux carnets (PDF).
Le site est hébergé gratuitement sur GitHub Pages et masqué des moteurs de recherche.

Le site est pensé pour Claire, sur iPhone et iPad : gros boutons, peu de réglages, chaque chose à un seul endroit.

Sur le site, on peut :

- partir du **sommaire** de l’accueil : les chapitres (apéritifs, entrées, plats…), toutes les recettes, ou la recherche ; le geste « retour » ramène au sommaire ;
- chercher une recette ou plusieurs ingrédients à la fois (« saumon avocat »), même avec une faute de frappe ;
- filtrer par nombre d’ingrédients, Thermomix, recettes à préparer à l’avance, recettes déjà cuisinées ;
- trouver une recette avec **ce qu’on a dans le frigo** : on tape quelques ingrédients sur l’accueil, le carnet propose la recette qui en utilise le plus ;
- ajuster les quantités au nombre de personnes (fractions, accords « 1 avocat → 2 avocats », quantités « par personne » laissées telles quelles) ;
- **partager** une recette (le lien, par WhatsApp ou Messages) ou la **copier** en texte, avec les quantités affichées, pour la coller où l’on veut ;
- lancer un minuteur en touchant une durée (« 20 minutes ») ; le **minuteur** reste sous la main sur toutes les pages, continue de tourner quand on change de page, garde l’écran allumé et sonne même en mode silencieux ;
- faire sa **liste de courses** : sur une recette, « + Courses » à côté de chaque ingrédient (ou « Courses » pour tous) ; ils se rangent sous leur recette, pour le nombre de personnes choisi. On coche au magasin, on peut tout regrouper (les quantités identiques sont additionnées) et l’envoyer par message ;
- **préparer un repas** : une liste déroulante par moment (apéritif, entrée, plat, accompagnement, dessert), le nombre d’invités, le planning (ce qui se prépare à l’avance) et toutes les courses d’un coup ;
- noter les recettes **déjà cuisinées** ;
- **envoyer une sélection** de recettes en un seul lien (le résultat d’une recherche) ;
- imprimer **le carnet en livre** (couverture, sommaire, une recette par page) ou l’enregistrer en PDF ;
- passer en **mode cuisine** : une étape à la fois, en grand, lue à voix haute si on le souhaite, écran qui reste allumé ; sur iPad en paysage, les ingrédients restent à côté ;
- agrandir le texte avec le bouton « Aa » en haut de chaque page (le site suit aussi la taille de texte choisie dans les réglages de l’iPhone) ;
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

Dans « Préparer un repas », une recette apparaît dans la liste de chacune de ses catégories (une soupe va avec les entrées, une sauce avec les accompagnements). Une recette `base` n’y apparaît pas, et la liste des desserts ne prend que les recettes `sucré` (les autres, que le `salé`).

## Ajouter une photo à une recette

1. Ouvrez le dossier `public/photos` du dépôt, cliquez sur **Add file → Upload files** et déposez la photo (de préférence au format paysage, en `.jpg`, moins de 1 Mo). Donnez-lui un nom simple, par exemple `tarte-aux-pommes.jpg`.
2. Dans la fiche de la recette, ajoutez la ligne `photo: tarte-aux-pommes.jpg` (par exemple juste sous `categories:`).

La photo apparaît en haut de la recette, sur sa fiche dans le carnet, et quand on partage le lien. Si le nom ne correspond à aucun fichier, la mise à jour s’arrête et l’onglet **Actions** l’indique.

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

GitHub Pages est gratuit mais public : toute personne qui a le lien peut voir le site. Les pages demandent aux moteurs de recherche de ne pas les indexer : on ne trouve donc pas le site par Google. La liste de courses, le repas en préparation et les recettes cuisinées sont gardés dans le navigateur de chacun.

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
