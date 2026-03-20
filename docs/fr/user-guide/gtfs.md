# Affichage des ensembles de données GTFS

<img :src="$withBase('/images/gtfs.jpg')" style="width: 576px;">

Mini Tokyo 3D prend en charge le [GTFS](https://gtfs.org) (General Transit Feed Specification) et le GTFS Realtime. En spécifiant les sources de données, vous pouvez visualiser les véhicules circulant le long des itinéraires sur une carte en temps réel.

Les véhicules de l'ensemble de données GTFS sont représentés sous forme de boîtes légèrement plus petites que les trains et avions Mini Tokyo 3D habituels. Les ensembles de données GTFS à afficher ne se limitent pas à la région de Tokyo, mais peuvent provenir de n'importe quelle région du monde. En d’autres termes, Mini Tokyo 3D peut être utilisé comme un simple visualiseur pour les ensembles de données GTFS.

::: warning
Notez qu'il s'agit d'une fonctionnalité expérimentale en cours de développement et susceptible de changer.
:::

## Spécification des sources de données

Pour spécifier un ensemble de données GTFS spécifique et un flux GTFS Realtime VehiclePosition, ajoutez un `?` suivi de paires clé/valeur (paramètres de requête) à l'URL pour accéder à Mini Tokyo 3D. Si vous spécifiez une URL de données comme `gtfsurl` ou `gtfsvpurl` qui est hébergée par le centre de données ouvert des transports publics et commence par `https://api.odpt.org/`, le paramètre `acl:consumerKey` spécifiant un jeton d'accès n'est pas requis.

```
https://minitokyo3d.com/?gtfsurl=<URL>&gtfsvpurl=<URL>&gtfscolor=<color code>
```

Paramètre de requête | Descriptif | Exemple
-- | -- | --
`gtfsurl` | L'URL d'un [GTFS dataset zip file](https://gtfs.org/documentation/schedule/reference/#_10) (encodage d'URL requis) | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Ffiles%2FToei%2Fdata%2FToeiBus-GTFS.zip`
`gtfsvpurl` | L'URL d'un [VehiclePosition feed of GTFS Realtime](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition) (encodage d'URL requis). En cas d'omission, les véhicules circuleront selon les horaires | `https%3A%2F%2Fapi-public.odpt.org%2Fapi%2Fv4%2Fgtfs%2Frealtime%2FToeiBus`
`gtfscolor` | Une couleur utilisée pour afficher les itinéraires et les véhicules. Code couleur hexadécimal (sans interligne `#`) | `9FC105`

Étant donné qu'un jeu de données GTFS à afficher ne couvre pas nécessairement la zone autour de Tokyo, il est utile de spécifier `#` suivi de plusieurs éléments séparés par `/` (hachage) pour rendre la position et l'orientation initiales de la carte adaptées à l'affichage du jeu de données. Le hachage doit être placé après les paramètres de requête ci-dessus.

```
https://minitokyo3d.com/?<query parameters>#<zoom>/<lat>/<lon>/<bearing>/<pitch>
```

Élément de hachage | Descriptif | Exemple
-- | -- | --
1er | Le niveau de zoom initial de la carte | `14`
2ème | La latitude du point central initial de la carte | `35.6814`
3ème | La longitude du point central initial de la carte | `139.7670`
4ème | Le relèvement initial (rotation) de la carte, mesuré en degrés dans le sens inverse des aiguilles d'une montre à partir du nord | `0`
5ème | L'inclinaison initiale (inclinaison) de la carte, mesurée en degrés par rapport au plan de l'écran (0-85) | `60`

## Affichage d'informations détaillées sur les véhicules

<img :src="$withBase('/images/vehicle-details.jpg')" style="width: 251px;">

Placez le pointeur de la souris ou appuyez sur le véhicule pour afficher des informations détaillées le concernant. Les informations détaillées incluent le nom de l'opérateur, le numéro de l'itinéraire, la destination, le numéro du véhicule, l'arrêt précédent et l'arrêt suivant.

## Suivi des véhicules

<img :src="$withBase('/images/vehicle-tracking.jpg')" style="width: 400px;">

Cliquer ou appuyer sur un véhicule activera le mode de suivi et l'écran se déplacera automatiquement en suivant le mouvement du véhicule. Il existe huit points de vue en mode suivi : « Position uniquement », « Arrière », « Haut-arrière », « Avant », « Haut-avant », « Hélicoptère », « Drone » et « Oiseau », vous permettant de profiter du paysage le long de l'itinéraire depuis votre point de vue préféré. Lorsque le mode de suivi est activé, les opérations de panoramique de la carte, de zoom avant/arrière, de rotation et d'inclinaison sont désactivées (le zoom avant/arrière, la rotation et l'inclinaison sont activés uniquement pour le point de vue « Position uniquement »). Cliquer ou appuyer sur une carte sans véhicule désactive le mode de suivi.Lorsque le mode de suivi est activé, l'horaire et la position actuelle du véhicule suivi sont affichés en bas de l'écran. L'horaire peut être défilé en utilisant la molette de la souris, en faisant glisser la barre de défilement ou en faisant glisser votre doigt. Cliquez ou appuyez sur l'icône « ∨ » dans le coin supérieur droit de l'horaire pour masquer l'horaire en bas de l'écran, et cliquez ou appuyez sur l'icône « ∧ » pour l'afficher à nouveau.

Le point de vue en mode suivi peut être modifié dans le panneau Paramètres du mode suivi. Voir [ici](./configuration.md#parametres-du-mode-de-suivi) pour plus de détails.