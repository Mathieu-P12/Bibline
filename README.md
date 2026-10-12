# Bibline

Frise chronologique interactive, utilisable sur ordinateur, tablette et téléphone.
En ligne : https://mathieu-p12.github.io/Timeline/

## Les fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La structure de la page : les écrans, les fenêtres, les champs. Aucun code de fonctionnement. |
| `styles.css` | Toute l'apparence : couleurs, polices, mise en page, mode sombre. |
| `app.js` | Le fonctionnement : frise, recherche, formulaires, carte, stockage local, versets. |
| `bible-books.js` | Les 66 livres de la Bible et leurs abréviations, en français, anglais et espagnol. |
| `data.json` | Le contenu livré avec l'application (événements et périodes de départ). |
| `sw.js` | Le « service worker » : installation en application et fonctionnement hors-ligne. |
| `manifest.json` | La fiche d'identité de l'application : nom, icônes, couleur. |
| `icon-*.png` | Les icônes de l'application. |

L'ordre de chargement compte : `bible-books.js` est lu avant `app.js`, qui s'en sert.

## Mettre une nouvelle version en ligne

1. Remplacer les fichiers modifiés à la racine du dépôt.
2. **Changer `CACHE_VERSION` dans `sw.js`** (par exemple `bibline-v0.9.4`).

Ce deuxième point est le seul vraiment indispensable : il efface l'ancien cache et force le
téléchargement groupé de tous les fichiers. Sans lui, un appareil pourrait garder un ancien
`app.js` avec un nouveau `index.html`. Si un fichier manque lors de la mise en ligne, les autres
sont tout de même mis en cache et la console du navigateur nomme le fichier absent.

## Le contenu de départ (`data.json`)

Il n'est installé qu'au tout premier lancement sur un appareil, quand la base locale est encore
vide. Ensuite, c'est la base de l'appareil qui fait foi : modifier `data.json` ne touche jamais aux
événements déjà saisis.

Ce fichier a exactement le format des exports de l'application. Pour le régénérer : dans les
paramètres, « Échanger des données » → « Envoyer », puis renommer le fichier obtenu en `data.json`.

## Où sont rangées les données saisies

Dans le navigateur de l'appareil (IndexedDB), pas sur le dépôt. Pour les transférer d'un appareil à
l'autre : « Envoyer » d'un côté, « Recevoir » de l'autre.

## Briques extérieures

- [Leaflet](https://leafletjs.com/) et OpenStreetMap / Esri pour le plan
- [Dexie](https://dexie.org/) pour le stockage local
- Noms et abréviations des livres bibliques repris du module Obsidian
  [JW Library Linker](https://github.com/msakowski/obsidian-library-linker) (licence Apache 2.0)
