# Plugins

Une variété de plugins sont disponibles pour afficher des informations supplémentaires sur la carte 3D. Les informations fournies par chaque plugin sont affichées sous forme de couche sur la carte et peuvent être activées et désactivées dans le panneau [Paramètres d'affichage des calques](./configuration.md#parametres-d-affichage-des-calques).

## Plugin de précipitations

<img :src="$withBase('/images/weather.jpg')" style="width: 580px;">

Basées sur les informations radar en temps réel, des animations de précipitations sont affichées sur la carte en fonction de l'intensité de la pluie. À mesure que vous augmentez le niveau de zoom, l'intensité des précipitations s'affiche en unités de maillage plus fines et est mise à jour toutes les 10 minutes avec les dernières informations.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D Precipitation Plugin](https://github.com/nagix/mt3d-plugin-precipitation).

## Plugin de feux d'artifice

<img :src="$withBase('/images/fireworks.jpg')" style="width: 580px;">

Ce plugin affiche des animations de feux d'artifice sur une carte. Vous pouvez regarder une animation 3D du lancement de feux d'artifice à un endroit spécifique de la carte, à une date et une heure programmées. Le jour où les festivals de feux d'artifice doivent avoir lieu, une liste des festivals apparaîtra sur le côté gauche de l'écran, et cliquer ou appuyer sur un élément vous amènera à l'endroit où le festival doit avoir lieu.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D Fireworks Plugin](https://github.com/nagix/mt3d-plugin-fireworks).

## Plugin de caméra en direct

<img :src="$withBase('/images/livecam.jpg')" style="width: 580px;">

Vous pouvez regarder les trains circuler grâce à des caméras en direct placées à divers endroits autour de Tokyo. En cliquant ou en appuyant sur un bouton de caméra en direct sur la carte, vous zoomerez sur l'emplacement et afficherez le flux vidéo de la caméra en direct diffusé depuis le même point de vue. La vidéo est transmise en temps réel, mais avec un décalage de quelques dizaines de secondes, le train réel a donc tendance à apparaître un peu plus tard que le mouvement du train sur la carte. Cliquer sur une carte où il n’y a pas de bouton de caméra en direct désélectionnera la caméra en direct.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D Live Camera Plugin](https://github.com/nagix/mt3d-plugin-livecam).

## Plugin PLATEAU

<img :src="$withBase('/images/plateau.jpg')" style="width: 580px;">

Un modèle de ville 3D de Tokyo fourni par [Project PLATEAU](https://www.mlit.go.jp/plateau/) est affiché en combinaison avec Mini Tokyo 3D. Des données géométriques détaillées et des textures des bâtiments sont disponibles pour le centre-ville, permettant l'affichage de paysages urbains très réalistes. En raison de la charge relativement lourde et des besoins en mémoire importants, une utilisation sur un appareil hautes performances est recommandée.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D PLATEAU Plugin](https://github.com/nagix/mt3d-plugin-plateau).

##Plugin GTFS

<img :src="$withBase('/images/gtfs-plugin.jpg')" style="width: 580px;">

Ce plugin affiche les itinéraires de transport en commun et les véhicules sur la carte Mini Tokyo 3D basée sur les ensembles de données [GTFS](https://gtfs.org/fr/) et les flux GTFS en temps réel. Comme pour les trains et les avions, passer le pointeur de la souris sur un véhicule ou appuyer dessus affichera des informations détaillées sur le véhicule. Cliquer ou appuyer sur un véhicule active le mode de suivi et l'écran se déplace automatiquement pour suivre le mouvement du véhicule. En raison de la charge relativement lourde et des besoins en mémoire importants, une utilisation sur un appareil hautes performances est recommandée.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D GTFS Plugin](https://github.com/nagix/mt3d-plugin-gtfs).

::: warning Avertissement
Actuellement, le plugin prend en charge l'affichage pour Toei Bus, Yokohama Municipal Bus et Keisei Bus Chiba West.
:::

## Plugin pour les Jeux Olympiques de Tokyo 2020

<img :src="$withBase('/images/olympics.jpg')" style="width: 580px;">

Ce plugin affiche des informations sur le calendrier des compétitions et les sites des Jeux Olympiques de Tokyo 2020, qui se sont déroulés du 23 juillet au 8 août 2021. Juste en dessous de l'affichage de l'heure dans le coin supérieur gauche de l'écran, un compte à rebours jusqu'à la cérémonie d'ouverture si elle a lieu avant l'événement, ou une indication du jour où l'on se trouve pendant l'événement sera affiché. De plus, des pictogrammes des compétitions apparaîtront sur la carte aux emplacements des sites de compétition, et lorsqu'ils seront cliqués ou appuyés, ils zoomeront sur cet endroit et afficheront les détails du calendrier des compétitions pour ce site. De plus, près de la station Kokuritsu-kyogijo, un modèle 3D élaboré du stade olympique construit pour les Jeux olympiques de Tokyo 2020 est exposé.

Pour plus d’informations, veuillez visiter le [dépôt GitHub du Mini Tokyo 3D Tokyo 2020 Olympics Plugin](https://github.com/nagix/mt3d-plugin-olympics2020).

::: warning Avertissement
Le plugin des Jeux olympiques de Tokyo 2020 n'est pas affiché sur [https://minitokyo3d.com](https://minitokyo3d.com). Vous pouvez consulter sur la page [Mini Tokyo 3D 2021 for Open Data Challenge for Public Transportation in Tokyo](https://minitokyo3d.com/2021/).
:::