Le **plan** est une carte du monde où figurent tous les éléments qui ont un **lieu** (voir la section « Lieu » de [[Ajouter et modifier un élément]]). Bouton **épingle** (n° 5 de [[le tour de l'écran|Premiers pas]]).

## Ouvrir le plan

![Le plan à l'ouverture : des bulles de densité sur fond satellite](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-01-ouverture.jpg)

La carte s'ouvre sur le monde entier, en **vue satellite**. Les boutons **+ / −** en haut à gauche, la molette ou le pincement zooment ; on glisse pour se déplacer.

## Trois niveaux d'affichage

Ce que la carte montre dépend du zoom : de loin, une vue d'ensemble ; de près, le détail.

| Zoom | Ce que vous voyez |
|---|---|
| **Très dézoomé** | Des **bulles de densité** : plus il y a d'événements dans une zone, plus la bulle est grande et rouge. Un clic sur une bulle zoome dessus. |
| **Intermédiaire** | Une **pastille par événement**, à la couleur de sa catégorie, sans texte. |
| **Rapproché** | La **photo** de l'événement (ou, sans photo, une pastille pleine) avec son **titre** à côté. |

![Zoom intermédiaire sur le Proche-Orient : de petites pastilles colorées](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-02-zoom-moyen.jpg)

![Zoom rapproché sur Jérusalem et Bethléem : les photos des événements et leurs titres](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-03-zoom-proche.jpg)

Aux deux niveaux détaillés, un **clic sur un marqueur ferme le plan et ouvre la fiche** sur la frise : la carte sert aussi de porte d'entrée vers la chronologie.

## Satellite ou plan

![Le fond « Plan » (OpenStreetMap) sur la même zone](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-04-fond-plan.jpg)

Le bouton en haut à droite (les deux calques superposés) bascule entre **Satellite** et **Plan** (le fond de carte routier d'OpenStreetMap), plus lisible pour lire des noms de lieux.

## Ajouter un événement directement sur la carte

![Le mode « Ajouter un événement ici » activé : un message invite à cliquer sur la carte](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-05-ajout-ici.jpg)

1. Cliquez **+ Ajouter un événement ici** : le bouton se colore et un message vous invite à choisir un endroit.
2. **Cliquez sur la carte** à l'endroit voulu.
3. Le formulaire d'ajout s'ouvre **par-dessus la carte**, avec la **latitude** et la **longitude déjà remplies** (section Lieu ouverte). Complétez le reste et enregistrez : voir [[Ajouter et modifier un élément]].

Le même principe sert à renseigner le lieu d'un élément existant : le bouton **Choisir sur la carte** de la section « Lieu » ouvre le plan, un clic remplit les coordonnées et referme la carte.

## Depuis une fiche

![La fiche de la Naissance de Jésus : le lieu « Bethléem » avec son épingle](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-06-fiche-lieu.jpg)

Quand un élément a un lieu, la fiche développée l'affiche avec une **épingle** ; un clic ouvre le plan **directement centré sur lui**.

![Le plan s'ouvre au niveau de Bethléem, avec Jérusalem toute proche](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/plan-07-depuis-fiche.jpg)

## À savoir

- **Les filtres s'appliquent** : un élément masqué par les filtres de catégories ([[Rechercher et filtrer]]) n'apparaît pas non plus sur le plan. Si aucun élément visible n'a de lieu, un message vous le rappelle.
- **Il faut une connexion** pour charger les fonds de carte : hors ligne, le plan s'ouvre mais les tuiles restent vides ([[Mobile et hors ligne]]).
- Les fonds de carte viennent d'**OpenStreetMap** et d'**Esri**, affichés grâce à la bibliothèque **Leaflet**.
