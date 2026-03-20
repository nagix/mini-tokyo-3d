# Écran et opérations

## Description de l'écran

<img :src="$withBase('/images/screen.jpg')" style="width: 659px;">

1. **Date et heure** : voir [Date et heure](#date-et-heure)
2. **Bouton de recherche** : voir [Recherche de stations](#recherche-de-stations)
3. **Boutons de navigation** : voir [Zoom avant/arrière](#zoom-avant-arriere) et [Rotation et inclinaison](#rotation-et-inclinaison)
4. **Boutons de changement de mode d'affichage** : voir [Modes d'affichage](./display-modes.md)
5. **Boutons de configuration** : Voir [Configuration](./configuration.md)

## Panoramique

<img :src="$withBase('/images/pan.jpg')" style="width: 244px;">

Vous pouvez déplacer votre position en parcourant la carte avec la souris ou en faisant glisser le doigt. Vous pouvez également parcourir la carte avec les touches fléchées de votre clavier.

## Zoom avant/arrière

<img :src="$withBase('/images/zoom.jpg')" style="width: 244px;"> <img :src="$withBase('/images/zoom-icon.jpg')" style="width: 59px; vertical-align: top;">

Cliquez ou appuyez sur le bouton icône « + » ou « – » pour zoomer ou dézoomer la carte. Vous pouvez également effectuer un zoom avant ou arrière en tournant la molette de la souris ou en pinçant l'écran.

Vous pouvez zoomer ou dézoomer sur la carte en appuyant sur la touche « = » ou « − » du clavier. Vous pouvez également zoomer sur la carte en double-cliquant avec la souris ou en appuyant trois fois, ou effectuer un zoom arrière en double-cliquant tout en maintenant enfoncée la touche Maj du clavier ou en appuyant avec deux doigts.

Un zoom encadré peut être utilisé en faisant glisser la souris tout en maintenant enfoncée la touche Maj du clavier et en sélectionnant un rectangle sur l'écran.

## Rotation et inclinaison

<img :src="$withBase('/images/rotate-tilt.jpg')" style="width: 244px;"> <img :src="$withBase('/images/compass-icon.jpg')" style="width: 59px; vertical-align: top;">

L'icône de la boussole représente l'orientation de la carte. Si vous appuyez sur le bouton de l'icône de la boussole et faites glisser la souris ou votre doigt vers la gauche ou la droite, vous pouvez faire pivoter la carte. Vous pouvez également modifier la rotation et l'inclinaison de la carte en faisant glisser avec le bouton droit de la souris, ou en faisant glisser avec le bouton gauche de la souris tout en maintenant enfoncée la touche Ctrl du clavier. Vous pouvez faire glisser deux doigts de haut en bas pour modifier l'inclinaison de la carte.

Vous pouvez également modifier la rotation et l'inclinaison de la carte en maintenant enfoncée la touche Maj de votre clavier et en appuyant sur les touches fléchées. Vous pouvez également faire pivoter la carte en pinçant l'écran.

Cliquez ou appuyez sur le bouton de l'icône de la boussole et le relèvement sera réinitialisé au nord géographique.

## Date et heure

<img :src="$withBase('/images/clock.jpg')" style="width: 147.5px;">

La date et l'heure actuelles sont affichées en haut à gauche de l'écran. C'est pratique pour accéder depuis l'étranger car l'heure standard du Japon est toujours affichée. Lorsque [le mode Lecture](./display-modes.md#mode-de-lecture) est activé, des boutons supplémentaires apparaissent sous l'heure actuelle pour modifier l'heure et la vitesse à laquelle l'heure progresse.

Voir [ici](./display-modes.md#mode-de-lecture) pour plus de détails sur le mode de lecture.

## Affichage d'informations détaillées sur les trains et les avions

<img :src="$withBase('/images/train-details.jpg')" style="width: 216px;"> <img :src="$withBase('/images/flight-details.jpg')" style="width: 216px; vertical-align: top;">

Placez le pointeur de la souris ou appuyez sur le train ou l'avion pour afficher des informations détaillées à ce sujet. Les informations détaillées sur le train comprennent le nom du chemin de fer, le type de train, la destination, le numéro du train, la gare précédente ou stationnaire et l'heure de départ, la gare suivante et l'heure d'arrivée, le temps de retard et les informations sur l'exploitation. Les détails du vol incluent le nom de la compagnie aérienne, le numéro de vol, le lieu de départ ou d'arrivée, le statut, l'heure de départ ou d'arrivée et les informations de partage de code. S'il y a un retard de train ou un changement d'horaire de vol, le changement sera surligné en orange.

## Affichage d'informations détaillées sur les stations

<img :src="$withBase('/images/station-details.jpg')" style="width: 216px;">

Placez le pointeur de la souris ou appuyez sur la station pour afficher des informations détaillées la concernant. Les informations détaillées incluent la photo de la station, les noms des stations et les noms des lignes de connexion. Si une station porte des noms différents pour différentes lignes mais constitue une seule station de transfert, les informations seront affichées ensemble.

## Suivi des trains et des avions

<img :src="$withBase('/images/tracking.jpg')" style="width: 400px;">

Cliquer ou appuyer sur un train ou un avion activera le mode de suivi et l'écran se déplacera automatiquement en suivant le mouvement du train ou de l'avion. Il existe huit points de vue en mode suivi : « Position uniquement », « Arrière », « Haut-arrière », « Avant », « Haut-avant », « Hélicoptère », « Drone » et « Oiseau », vous permettant de profiter du paysage le long de la voie ferrée depuis votre point de vue préféré. Lorsque le mode de suivi est activé, les opérations de panoramique de la carte, de zoom avant/arrière, de rotation et d'inclinaison sont désactivées (le zoom avant/arrière, la rotation et l'inclinaison sont activés uniquement pour le point de vue « Position uniquement »). Cliquer ou appuyer sur une carte sans trains ni avions désactive le mode de suivi.

Lorsque le mode de suivi est activé, l'horaire et la position actuelle du train suivi sont affichés en bas de l'écran. Pour les trains en correspondance avec d'autres lignes, les horaires de ces lignes sont également indiqués. L'horaire peut être défilé en utilisant la molette de la souris, en faisant glisser la barre de défilement ou en faisant glisser votre doigt. Cliquez ou appuyez sur l'icône « ∨ » dans le coin supérieur droit de l'horaire pour masquer l'horaire en bas de l'écran, et cliquez ou appuyez sur l'icône « ∧ » pour l'afficher à nouveau.

De plus, lorsque le mode de suivi est activé, certains appareils affichent le [bouton de partage](./screen-and-operations.md#partager-des-trains-et-des-vols) pour partager le train ou le vol suivi.

Le point de vue en mode suivi peut être modifié dans le panneau Paramètres du mode suivi. Voir [ici](./configuration.md#parametres-du-mode-de-suivi) pour plus de détails.

## Partager des trains et des vols

<img :src="$withBase('/images/share-button.jpg')" style="width: 211px;">

Lorsque [le mode Suivi](./screen-and-operations.md#suivi-des-trains-et-des-avions) est activé, le bouton « Partager ce train » ou « Partager ce vol » apparaîtra en haut de l'écran. En cliquant ou en appuyant sur le bouton, un menu supplémentaire apparaîtra, en fonction de l'appareil que vous utilisez, et vous pourrez envoyer les URL de suivi des trains ou des vols et des messages facultatifs via des applications de messagerie, des e-mails ou des applications de réseaux sociaux. Lorsque le destinataire des informations ouvrira l'URL dans son navigateur, Mini Tokyo 3D sera lancé et il pourra suivre le même train ou vol.

Cette fonctionnalité est disponible dans tous les navigateurs sauf Firefox.

## Train retardé

<img :src="$withBase('/images/delay-marker.jpg')" style="width: 185px;">

Lorsque [le mode Lecture](./display-modes.md#mode-de-lecture) est désactivé, des sphères orange s'affichent autour des trains en retard de plus d'une minute. Il est facile de voir quelles sections de la carte présentent un retard.

## Recherche de stations

<img :src="$withBase('/images/search-icon.jpg')" style="width: 270px;">

Cliquez ou appuyez sur le bouton icône en forme de loupe pour ouvrir le champ de saisie du nom de la station. Entrez le nom de la station et appuyez sur la touche Entrée, ou cliquez ou appuyez sur le bouton icône en forme de loupe pour vous déplacer vers l'emplacement de la station sur la carte et avoir la station [sélectionnée](#selection-des-stations).

Lorsque vous saisissez une partie du nom de la station, une liste de candidats s'affichera et vous pourrez en sélectionner un dans la liste pour compléter votre saisie. Dans les environnements japonais, coréen et chinois, vous pouvez également effectuer une recherche par nom anglais.

## Sélection des stations

<img :src="$withBase('/images/station-selection.jpg')" style="width: 400px;">

Lorsque vous cliquez ou appuyez sur une station, la station est sélectionnée, vous vous déplacez sur la carte pour que la station soit centrée sur l'écran et la carte autour de la station est agrandie. Lorsqu'une station est sélectionnée, les [affichage du tableau de départ du train](#affichage-du-tableau-de-depart-du-train), [recherche d'itinéraire](#recherche-d-itineraire) et [affichage des informations de sortie de station](#affichage-des-informations-de-sortie-de-station) s'affichent en bas de l'écran. Vous pouvez changer l'affichage de chaque information en cliquant sur le bouton bascule situé sous le nom de la station. Cliquez ou appuyez sur l'icône « ∨ » à droite du nom de la station pour masquer les informations en bas de l'écran, et cliquez ou appuyez sur l'icône « ∧ » pour l'afficher à nouveau. Cliquer ou appuyer sur la carte là où aucune station n’existe désélectionnera la station.

## Affichage du tableau de départ du train

<img :src="$withBase('/images/station-departures.jpg')" style="width: 400px;">

Une fois une gare sélectionnée, cliquez ou appuyez sur le bouton bascule « Départs » sous le nom de la gare en bas de l'écran pour afficher le panneau de départ du train. Le tableau de départ des trains comprend l'heure de départ, le type de train, la destination et le temps de retard du premier et du prochain train dans chaque direction sur les lignes de correspondance de la gare. Si un train est en retard, l'heure de départ et le temps de retard sont surlignés en orange.

## Recherche d'itinéraire

<img :src="$withBase('/images/search-form.jpg')" style="width: 400px;"> <img :src="$withBase('/images/search-route.jpg')" style="width: 400px;">

Une fois une station sélectionnée, cliquez ou appuyez sur le bouton bascule « Vers ici » ou « De là » sous le nom de la station en bas de l'écran pour afficher le panneau de saisie des critères de recherche d'itinéraire. Saisissez le nom de la gare de départ pour « Vers ici » ou le nom de la gare d'arrivée pour « De là », sélectionnez l'heure de départ et cliquez ou appuyez sur le bouton de recherche. Ensuite, un itinéraire recommandé sera mis en évidence sur la carte et le panneau des résultats de recherche affichera des informations telles que les trains à prendre, les heures d'arrivée et de départ et les gares de transfert. Selon les conditions, plusieurs suggestions d'itinéraire peuvent être affichées et vous pouvez basculer entre les itinéraires en appuyant sur les boutons « < » et « > » en haut du panneau des résultats de recherche ou en faisant glisser votre doigt horizontalement sur le panneau. Vous pouvez également cliquer ou appuyer sur le bouton icône « Retour » pour revenir au panneau de saisie des critères.

Lorsque vous saisissez une partie du nom de la station, une liste de candidats s'affichera et vous pourrez en sélectionner un dans la liste pour compléter votre saisie. Dans les environnements japonais, coréen et chinois, vous pouvez également effectuer une recherche par nom anglais. Vous pouvez également saisir la gare de départ ou d'arrivée en cliquant ou en tapant sur les gares sur la carte.

Les trains, les avions et les couches seront temporairement masqués lorsque le panneau de saisie des critères ou le panneau des résultats de recherche sera affiché.

::: warning Avertissement
Depuis la version 4.0 (beta 2), il y a quelques limitations : vous pouvez uniquement préciser l'heure de départ, et vous pouvez uniquement rechercher le train du jour.
:::

## Affichage des informations de sortie de station

<img :src="$withBase('/images/station-exits.jpg')" style="width: 490px;">

Une fois une station sélectionnée, cliquez ou appuyez sur le bouton à bascule « Sorties » sous le nom de la station en bas de l'écran pour afficher une liste des sorties, ainsi que l'emplacement et le nom de la sortie sur la carte. Si vous déplacez le pointeur de la souris sur le nom de la sortie dans la liste, le nom de la sortie sera mis en évidence sur la carte et vous pourrez vérifier l'emplacement. De plus, si vous cliquez ou appuyez sur le nom de la sortie dans la liste, une carte de la zone autour de la sortie sera agrandie.

Outre les noms, la liste des sorties indique également les horaires d'ouverture et les icônes des escaliers ou des installations sans obstacle. Les sorties fermées en raison de travaux ou pour d'autres raisons, ou les sorties fermées en dehors des heures d'ouverture, sont indiquées en orange. La signification des icônes des installations sans obstacle est la suivante.

Icône | Description
:-:|:--
<img :src="$withBase('/images/stairs-icon.jpg')" style="width: 28px; vertical-align: top;">|Escaliers
<img :src="$withBase('/images/ramp-icon.jpg')" style="width: 28px; vertical-align: top;">|Rampe pour fauteuil roulant
<img :src="$withBase('/images/escalator-icon.jpg')" style="width: 28px; vertical-align: top;">|Escalier
<img :src="$withBase('/images/elevator-icon.jpg')" style="width: 28px; vertical-align: top;">|Ascenseur

::: warning Avertissement
Depuis la version 4.0 (bêta 2), seules les lignes et stations de métro sont prises en charge pour l'affichage des informations de sortie des stations.
:::