# Configuration

## Paramètres d'affichage des couches

<img :src="$withBase('/images/layer-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/layer-icon.jpg')" style="width: 59px; vertical-align: top;">

Cliquez ou appuyez sur le bouton de l'icône de la couche pour afficher le panneau Paramètres d'affichage de la couche. Dans le panneau Paramètres d'affichage des couches, vous pouvez activer/désactiver la couche superposée à la carte. En incorporant le [Plugins](./plugins.md), la couche Précipitations, la couche Feux d'artifice, la couche Caméras en direct, la couche PLATEAU, la couche GTFS et la couche Jeux olympiques de Tokyo 2020 seront affichées dans la liste. Cliquez ou appuyez sur le bouton « x » dans le coin supérieur droit du panneau ou à l'extérieur du panneau pour fermer le panneau.

Cliquez ou appuyez sur l'icône de chaque calque pour activer ou désactiver l'affichage des calques (le cadre extérieur de l'icône est affiché en bleu clair lorsqu'il est activé). Voir [ici](./plugins.md) pour en savoir plus sur les fonctions de chaque couche.

## Paramètres du mode de suivi

<img :src="$withBase('/images/tracking-mode-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/camera-icon.jpg')" style="width: 59px; vertical-align: top;">

Cliquez ou appuyez sur le bouton de l'icône de la caméra pour afficher le panneau Paramètres du mode de suivi. Le panneau Paramètres du mode de suivi vous permet de basculer la position du point de vue utilisée lors du suivi d'un train ou d'un avion. Cliquez ou appuyez sur le bouton « x » dans le coin supérieur droit du panneau ou à l'extérieur du panneau pour fermer le panneau.

### Poste uniquement

<img :src="$withBase('/images/tracking-position.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible sans modifier la distance, la direction ou l'angle de dépression actuel. Dans ce mode de point de vue, la carte peut être zoomée et dézoomée, pivotée et inclinée à l'aide des boutons de navigation ou des commandes du clavier.

### Retour

<img :src="$withBase('/images/tracking-back.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible par derrière, face au sens de déplacement.

### Haut-dos

<img :src="$withBase('/images/tracking-topback.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible en diagonale au-dessus et derrière lui tout en gardant sa direction de déplacement vers le haut.

### Avant

<img :src="$withBase('/images/tracking-front.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible depuis l'avant de celui-ci, face au sens de déplacement opposé.

### Devant supérieur

<img :src="$withBase('/images/tracking-topfront.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible en diagonale au-dessus et devant lui tout en gardant sa direction de déplacement vers le bas.

### Hélicoptère

<img :src="$withBase('/images/tracking-helicopter.jpg')" style="width: 400px;">

Il effectue un virage à 360 degrés depuis une perspective aérienne autour du train ou de l'avion cible.

### Drone

<img :src="$withBase('/images/tracking-drone.jpg')" style="width: 400px;">

Il effectue un virage à 360 degrés à une altitude plus basse et à une distance plus proche du train ou de l'avion cible.

### Oiseau

<img :src="$withBase('/images/tracking-bird.jpg')" style="width: 400px;">

Il suit le train ou l'avion cible, en modifiant de manière fluide et dynamique la distance, la direction et l'angle de dépression.

## Affichage des informations sur l'application

<img :src="$withBase('/images/about-panel.jpg')" style="width: 490px;"> <img :src="$withBase('/images/info-icon.jpg')" style="width: 59px; vertical-align: top;">

Cliquez ou appuyez sur le bouton de l'icône d'information pour afficher les informations sur l'application et les données. L'heure de la dernière mise à jour des données statiques et des données dynamiques est également affichée. Cliquez ou appuyez sur le bouton « x » dans le coin supérieur droit du panneau ou à l'extérieur du panneau pour fermer le panneau.