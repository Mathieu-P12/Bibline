Les réponses aux questions qui reviennent le plus souvent. Si la vôtre n'y est pas, ouvrez une [issue sur GitHub](https://github.com/Mathieu-P12/Bibline/issues).

## Mes données

### Où sont enregistrées mes données ?

**Sur votre appareil, dans le navigateur** (ou dans l'application installée). Il n'y a ni compte, ni serveur : personne d'autre que vous n'y a accès, et rien n'est envoyé nulle part. Tout est enregistré **automatiquement**, à chaque modification.

### Ai-je besoin d'un compte ?

Non. Ni inscription, ni mot de passe.

### Mes éléments ont disparu. Que s'est-il passé ?

Vos données sont liées au **navigateur** qui les a créées. Elles semblent « disparaître » dans trois cas :

- vous ouvrez Bibline dans **un autre navigateur** (ou un autre appareil) : la frise y est neuve ;
- vous avez **vidé les données du site** (ou l'historique complet) dans le navigateur ;
- vous utilisez la **navigation privée**, dont le contenu est effacé à la fermeture.

Rouvrez Bibline dans le navigateur habituel. Et **faites une sauvegarde de temps en temps** : [[Sauvegarder et échanger]].

### Comment retrouver ma frise sur un autre appareil ?

Il n'y a pas de synchronisation automatique. Exportez avec **Envoyer**, transmettez le fichier (message, mail, cloud…), puis ouvrez-le avec **Recevoir** sur l'autre appareil. Attention aux doublons : [[Sauvegarder et échanger]].

### J'ai supprimé un élément par erreur. Peut-on le récupérer ?

Non : la suppression est **définitive** (l'application demande d'abord une confirmation). Si vous avez une sauvegarde récente, **Recevoir** permet de réimporter la catégorie concernée.

### Mon import a doublé les éléments

**Recevoir** ajoute toujours, sans chercher les doublons. Supprimez les éléments en trop un par un (la [[liste des dates|Les listes]] aide à les repérer).

## Ce que je vois (ou ne vois pas)

### Un élément que j'ai ajouté n'apparaît pas sur la frise

Vérifiez dans l'ordre :

1. **Les filtres** (l'entonnoir) : sa catégorie est-elle cochée ? Un élément qui n'en a aucune relève de « Sans catégorie » ([[Rechercher et filtrer]]).
2. **Le niveau de zoom** : très dézoomée, la frise ne nomme que certains éléments ([[Paramètres]], « Catégories en vue globale »). Zoomez sur la période, ou cherchez le titre dans la recherche : la frise se centre dessus.
3. **La date** : une année mal saisie (oubli de « av. n. è. », par exemple) place l'élément à l'autre bout de la frise. La recherche le retrouve.

### Pourquoi la frise s'arrête-t-elle à -4500 et 2036 ?

C'est l'étendue actuelle de la frise : environ 6 500 ans, du plus ancien au plus récent.

### Pourquoi y a-t-il « vers » devant certaines dates ?

Parce qu'elles sont **approximatives** : c'est le cas de la plupart des dates bibliques. Vous cochez **Date(s) approximative(s)** dans le formulaire d'un élément ([[Ajouter et modifier un élément]]).

### D'où viennent les dates du contenu de départ ?

La chronologie des événements bibliques suit la chronologie traditionnelle telle que présentée sur [jw.org](https://www.jw.org). Celle des personnages de l'arbre est **approximative** : à vérifier selon vos propres sources. Tout est modifiable.

### Le plan est vide, ou gris

Les **fonds de carte** viennent d'internet : hors connexion, ils ne s'affichent pas. Vérifiez votre connexion. Les éléments sans **lieu** (latitude et longitude) ne figurent pas non plus sur le plan ([[Le plan]]).

### Une image ne s'affiche pas

Les images « par lien » dépendent du site qui les héberge. Le lien est peut-être mort, ou le site **refuse** d'être affiché ailleurs. Essayez une autre adresse, ou **importez le fichier** de l'image depuis votre appareil : elle sera alors conservée avec l'élément ([[Ajouter et modifier un élément]]).

### Les titres ne changent pas quand je change la langue

C'est normal : la langue concerne l'**interface**. Ce que vous avez écrit, titres, descriptions, notes, reste tel quel ([[Paramètres]]).

## Versets et références

### Un verset ne s'ouvre pas dans JW Library

- Vérifiez le réglage **Ouvrir les versets dans** ([[Paramètres]]) : **JW Library**, ou **jw.org**.
- Avec **JW Library**, l'application doit être **installée** sur l'appareil ; sinon l'adresse ouverte est celle de jw.org.
- Dans une note, un verset n'est reconnu que s'il est écrit comme dans [[Ajouter et modifier un élément]] (par exemple `Gen 22:17, 18`). Sinon, le texte reste du texte.

## Utilisation

### Puis-je utiliser Bibline sans connexion ?

Oui, une fois ouverte au moins une fois avec une connexion : voir [[Mobile et hors ligne]]. Seuls les fonds de carte et les images distantes ont besoin d'internet.

### Le mode édition modifie-t-il ma frise ?

Non. Il **lit** la frise pour fabriquer une planche, puis l'exporte. Rien n'est écrit dans vos données ([[Mode édition et export]]).

### Mon PDF exporté n'a pas de texte sélectionnable

C'est voulu : la planche y est une image haute définition. Pour du texte copiable, servez-vous des fiches de la frise elle-même.

### L'application ne se met pas à jour

Fermez-la **complètement**, rouvrez-la avec une connexion, attendez quelques secondes, puis fermez-la et rouvrez-la encore une fois : [[Mobile et hors ligne]].

### Comment savoir quelle version j'utilise ?

En bas des **Paramètres**, à la ligne « Mentions » ([[Paramètres]]).

## Aller plus loin

### Puis-je héberger ma propre copie ?

Oui, c'est du simple HTML, CSS et JavaScript, sans serveur : voir [[Pour les développeurs]].

### Comment signaler un bug ou proposer une idée ?

Sur la page [Issues](https://github.com/Mathieu-P12/Bibline/issues) du dépôt. Décrivez ce que vous faisiez, ce que vous attendiez, ce qui s'est passé, et sur quel appareil ou navigateur.
