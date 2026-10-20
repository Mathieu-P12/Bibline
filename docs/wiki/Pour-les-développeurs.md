Cette page s'adresse à celles et ceux qui veulent **héberger leur propre copie**, comprendre comment Bibline est construite ou la faire évoluer. Si vous voulez seulement **l'utiliser**, rendez-vous plutôt sur [[Premiers pas]].

## Principe

Bibline est du **HTML, du CSS et du JavaScript « à l'ancienne »** : aucun serveur, aucun compte, aucune étape de compilation, aucune dépendance à installer. On dépose les fichiers sur n'importe quel hébergement statique (GitHub Pages, par exemple), et ça marche.

| Brique | Rôle |
|---|---|
| **Canvas 2D** | Moteur de rendu de la frise : seuls les éléments visibles sont dessinés |
| **[Dexie.js](https://dexie.org)** | Stockage local persistant (IndexedDB) |
| **[Leaflet](https://leafletjs.com)** + OpenStreetMap / Esri | Carte interactive |
| **SVG** | Arbre généalogique : placement calculé, liens tracés, zoom et déplacement |
| **Export PNG / JPG / PDF** | Planche dessinée sur un canvas ; PNG et JPG natifs, PDF d'une page assemblé à la main (aucune bibliothèque) |
| **Service Worker** | Cache de l'application pour le fonctionnement hors ligne |

Dexie et Leaflet sont chargés depuis **cdnjs** (versions figées dans `index.html`) ; le service worker les garde ensuite en cache.

## Héberger votre propre copie

1. **Forkez** le dépôt [Mathieu-P12/Bibline](https://github.com/Mathieu-P12/Bibline).
2. Dans **Settings → Pages**, choisissez la branche `main` et le dossier racine `/`.
3. Votre copie est disponible sur `https://<votre-compte>.github.io/<nom-du-dépôt>/`.

Les chemins sont tous **relatifs** : la copie fonctionne aussi dans un sous-dossier, ou sur tout autre hébergement statique.

## Les fichiers

```
├── index.html              Structure de la page : écrans, fenêtres, champs
├── styles.css              Apparence : couleurs, polices, mise en page, mode sombre
├── app.js                  Fonctionnement : frise, recherche, formulaires, carte, stockage
├── arbre.js                Arbre généalogique : placement, liens, volet, filtre, ajout de personnages
├── edition.js              Mode édition : composition d'une vue, aperçu, export PDF / PNG / JPG
├── bible-books.js          Les 66 livres de la Bible et leurs abréviations (FR · EN · ES)
├── data.json               Contenu livré avec l'application
├── manifest.json           Déclaration de l'application installable
├── sw.js                   Service worker (cache hors ligne)
├── icon-192.png            Icônes de l'application
├── icon-512.png
├── icon-512-maskable.png
└── docs/                   Logo, captures d'écran et sources de ce Wiki
```

L'ordre de chargement compte : `bible-books.js`, `arbre.js` et `edition.js` sont lus **avant** `app.js`, qui s'en sert. Si `arbre.js` ou `edition.js` manquait, la frise fonctionnerait quand même : seuls les boutons concernés (l'arbre, l'édition) disparaîtraient.

## Mettre une nouvelle version en ligne

1. Remplacer les fichiers modifiés à la racine du dépôt.
2. **Changer `CACHE_VERSION` dans `sw.js`** (par exemple `bibline-v0.11.2`), et `APP_VERSION` dans `app.js` pour que le numéro affiché dans les Paramètres suive.

Le point 2 est **indispensable** : il efface l'ancien cache et force le téléchargement groupé de tous les fichiers. Sans lui, un appareil pourrait garder un ancien `app.js` à côté d'un nouveau `index.html`.

- Si un fichier manque lors de la mise en ligne, les autres sont tout de même mis en cache et la console du navigateur nomme celui qui manque.
- **Un nouveau fichier de code** (comme `edition.js`) doit aussi être ajouté à la liste `APP_SHELL` de `sw.js`, faute de quoi il ne serait pas disponible hors ligne.
- Le service worker active la nouvelle version dès qu'elle est installée (`skipWaiting` puis `clients.claim`) : un appareil la reçoit à l'ouverture suivante ([[Mobile et hors ligne]]).
- Les **tuiles de carte** (OpenStreetMap, Esri) ne passent jamais par le cache : trop nombreuses et trop lourdes.

Deux noms techniques gardent volontairement une ancienne appellation : la base locale (`FriseChronologiqueDB`) et la clé des réglages (`frise-settings`). Les renommer donnerait un code plus coquet et **viderait la frise de chaque appareil** : un autre nom, c'est une autre base, vide.

## Le contenu de départ (`data.json`)

Il n'est installé qu'au **tout premier lancement** sur un appareil, quand la base locale est encore vide. Ensuite, c'est la base de l'appareil qui fait foi : modifier `data.json` ne touche jamais aux événements déjà saisis.

Ce fichier a **exactement le format des exports** de l'application. Pour le régénérer : **Paramètres → Échanger des données → Envoyer**, puis renommer le fichier obtenu en `data.json` ([[Sauvegarder et échanger]]).

## L'arbre généalogique

### Deux bases, un identifiant

Un personnage est un **élément ordinaire de la frise** (catégorie « Personnage ») : nom, dates, photo, description, références. Un événement s'il est placé à sa naissance, une période naissance → décès si son décès est connu.

Ce que la frise ne sait pas dire (sexe, note généalogique, liens père / mère / conjoint / enfants) est conservé **à part**, dans la table `meta` de la base locale (clé `genealogie`), et ne renvoie aux éléments que par leur **identifiant**. Supprimer un personnage de la frise retire donc ses liens de l'arbre, sans rien casser d'autre.

### Les catégories livrées avec l'arbre

Elles sont déclarées dans `arbre.js` : `SEED_CATS` (nom, couleur) et `SEED_TAGS` (quels personnages du contenu de départ en font partie). Elles sont créées et attribuées **une seule fois par appareil** (l'étape atteinte est mémorisée dans `state.init`, comparée à `SEED_VERSION`) :

- on **ajoute seulement**, jamais on ne retire ni n'écrase : une catégorie déjà créée à la main sous la même clé est réutilisée telle quelle, et un personnage supprimé ou renommé n'est simplement pas reconnu ;
- une catégorie supprimée ensuite **ne revient pas**, puisque l'étape n'est jamais rejouée.

Pour livrer plus tard de nouvelles catégories (Prophètes, Rois…) : compléter `SEED_CATS` et `SEED_TAGS`, ajouter une étape dans `seedIfNeeded` (`if(state.init < 3){ … state.init = 3; }`) et passer `SEED_VERSION` à 3. Les appareils déjà à jour la recevront une fois, les autres enchaîneront les étapes.

### La vue globale

Le réglage « Catégories en vue globale » est posé au départ sur **Personnage** avec la condition **Personnage principal** (`PRINCIPAL_KEY` dans `app.js`). Un appareil dont ce réglage n'avait jamais été touché est migré une fois (`overviewDefaultsV`) ; un réglage personnalisé n'est jamais modifié, et une condition qui renvoie à une catégorie supprimée est simplement ignorée.

## Le mode édition

Le mode édition ne fait que **lire** la frise : au démarrage, `app.js` lui remet un petit objet (`editionApi`) qui donne accès aux éléments, aux catégories, à la vue affichée et à la langue. `edition.js` n'écrit jamais dans la base de l'appareil ; ses propres réglages (période, catégories, éléments masqués, plis, format…) sont gardés à part, dans le stockage du navigateur, sous la clé `bibline-edition`.

- **Un seul dessin** sert à l'aperçu et aux fichiers (`renderSheet`, sur une feuille de 1000 unités de large) : ce que l'on voit est exactement ce qui est exporté.
- **Les plis** découpent l'échelle du temps en morceaux (`buildScale`) : l'échelle est proportionnelle entre deux plis, et chaque pli a une largeur fixe.
- **Les images** venues d'un autre site « salissent » un canvas, et le navigateur refuse alors d'en tirer un fichier. Chacune est donc chargée par `fetch` (mode CORS), recopiée en version réduite, puis dessinée. Si le site refuse, ou sans connexion, la fiche est exportée sans image.
- **Le PDF** est écrit à la main : une page qui contient la planche en JPEG. Aucune bibliothèque, donc rien de plus à charger hors ligne.
- **La taille** des fichiers (A4 ou A3, 150 ou 300 dpi) est plafonnée à 16 millions de pixels, ce que les téléphones savent produire.

## Ce Wiki

Les pages du Wiki et leurs captures d'écran sont conservées dans le dépôt, sous `docs/wiki/` (les images dans `docs/wiki/images/`). Le Wiki GitHub est un dépôt à part (`Bibline.wiki.git`) : on y recopie les fichiers `.md`, et les pages lisent leurs images directement depuis la branche `main` du dépôt principal.

## Contribuer

Idées, remarques, bugs : ouvrez une [issue](https://github.com/Mathieu-P12/Bibline/issues). Bibline est conçue par **Mathieu**, qui en porte la vision, le design et les retours d'usage ; le code a été écrit de façon itérative avec [Claude](https://claude.ai), l'assistant d'Anthropic.

Les noms et abréviations des livres bibliques proviennent du module Obsidian [JW Library Linker](https://github.com/msakowski/obsidian-library-linker) (licence Apache 2.0).
