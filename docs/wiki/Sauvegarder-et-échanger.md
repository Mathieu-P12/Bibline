Vos données vivent **sur votre appareil**, dans le navigateur. Pour les **sauvegarder**, les **partager** ou les **transférer** vers un autre appareil, Bibline les emballe dans un simple **fichier** (`.json`) : c'est le rôle des boutons **Envoyer** et **Recevoir**.

Où les trouver : **Paramètres** (n° 9 de [[le tour de l'écran|Premiers pas]]) → **Échanger des données**.

## Envoyer : créer un fichier

![La fenêtre « Envoyer des événements » : une case par catégorie, avec son nombre d'éléments](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/echange-01-envoyer.jpg)

1. Cliquez **Envoyer**.
2. **Cochez les catégories** à emporter. Le nombre à droite indique ce que contient chacune. **Tout sélectionner** coche (ou décoche) tout, et le champ **Rechercher une catégorie…** aide quand la liste est longue.
3. Cliquez **Télécharger le fichier**.

![Après une recherche, une seule catégorie cochée : « Bibliothèques »](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/echange-02-selection.jpg)

Le fichier est nommé d'après son contenu, avec la date du jour :

| Ce que vous avez coché | Nom du fichier |
|---|---|
| Une seule catégorie | `bibline-bibliotheques-2026-10-20.json` |
| Plusieurs catégories | `bibline-categories-2026-10-20.json` |
| Tout, **ou rien du tout** | `bibline-all-categories-2026-10-20.json` |

Il contient les **éléments** (événements et périodes) des catégories cochées, leurs **catégories** (nom et couleur), leurs **images** et, pour les personnages, leurs **liens familiaux**. Un élément qui a plusieurs catégories est emporté dès qu'**une seule** d'entre elles est cochée.

> 💡 **Une sauvegarde complète**, c'est simplement **Envoyer sans rien cocher**, puis **Télécharger le fichier**. Faites-la de temps en temps : si vous videz les données du navigateur, elles disparaissent avec.

## Recevoir : ouvrir un fichier

1. Cliquez **Recevoir** et choisissez le fichier.
2. Un message confirme : « *N événement(s) et N période(s) importés avec succès* ».

![Le message de confirmation sous la ligne « Échanger des données »](https://raw.githubusercontent.com/Mathieu-P12/Bibline/main/docs/wiki/images/echange-03-recevoir.jpg)

Ce qui se passe :

- les éléments du fichier sont **ajoutés** à votre frise, **sans rien écraser** de l'existant ;
- les **catégories** qui n'existent pas encore chez vous sont **créées** (celles qui existent déjà sont conservées telles quelles) ;
- les **personnages** reçus sont **reliés entre eux** comme dans le fichier : père, mère, conjoint, enfants.

Si le fichier n'est pas un export de Bibline, l'application le dit : « Ce fichier n'a pas pu être lu : vérifiez qu'il s'agit bien d'un export de cette application. »

## Deux pièges à connaître

> ⚠️ **Recevoir ne détecte pas les doublons.** Importer deux fois le même fichier ajoute deux fois les éléments.

> ⚠️ **Un appareil neuf contient déjà le contenu de départ.** Si vous y importez une sauvegarde **complète**, tout ce qui venait d'origine se retrouve en double. Pour transférer vos **propres ajouts**, exportez **seulement vos catégories** (ou une catégorie créée pour l'occasion).

## Scénarios

| Je veux… | Je fais… |
|---|---|
| Sauvegarder toute ma frise | **Envoyer**, rien de coché, enregistrer le fichier en lieu sûr |
| Passer mes ajouts de mon ordinateur à mon téléphone | **Envoyer** mes catégories → fichier envoyé par message, mail ou cloud → **Recevoir** sur le téléphone |
| Partager une catégorie avec un proche | **Envoyer** cette catégorie → il l'ouvre avec **Recevoir** |
| Repartir à zéro, puis retrouver mes données | **Recevoir** la sauvegarde sur l'appareil vierge… en tenant compte du deuxième piège ci-dessus |
