# DataSource

L'objet `DataSource` est utilisé pour spécifier une source de données de trains, de vols ou de bus. Ce qu'une source de données charge est déterminé par les propriétés d'URL qu'elle porte. Les sources de données peuvent être définies sous forme de tableau dans l'option du constructeur [`Map`](./map.md) `dataSources`, ou ajoutées et supprimées à l'exécution avec [`Map#addDataSource`](./map.md#adddatasource-source) et [`Map#removeDataSource`](./map.md#removedatasource-id).

Pour les données de trains (`trainUrl` et `trainInfoUrl`), le format de chaque objet est détecté automatiquement à partir de son `@type` : les objets dont le `@type` est `'odpt:Train'` ou `'odpt:TrainInformation'` sont analysés au format brut [ODPT](https://www.odpt.org/en/), sinon au format Mini Tokyo 3D pré-normalisé. Lorsque plusieurs sources de données contiennent le même train, vol ou information sur les trains, les sources qui apparaissent plus tard dans le tableau remplacent les précédentes.

Pour une URL dont l'hôte est enregistré comme hôte compatible ODPT, le jeton d'accès correspondant dans [`Secrets`](./secrets.md) est automatiquement ajouté comme clé de consommateur.

En raison de la politique de même origine, les URL chargées par une source de données doivent être soit sur la même origine que Mini Tokyo 3D lui-même, soit servies avec une configuration CORS (partage des ressources entre origines) appropriée.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

### **`atisUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

L'URL des données d'information sur le trafic aéroportuaire (ATIS), utilisées avec `flightUrl` pour déterminer l'exploitation des pistes. En cas d'omission, aucune donnée ATIS n'est chargée à partir de cette source de données.

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Pour une source de données GTFS (avec `gtfsUrl`), une couleur utilisée pour afficher les itinéraires et les véhicules. Elle est spécifiée par un code couleur hexadécimal commençant par `#`.

### **`expiresAt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Une chaîne de date-heure [ISO 8601](https://fr.wikipedia.org/wiki/ISO_8601). Une fois que l'heure actuelle atteint cette valeur, la source de données n'est plus chargée. En cas d'omission, la source de données n'expire jamais.

### **`flightUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

L'URL des données de vols. En cas d'omission, aucun vol n'est chargé à partir de cette source de données.

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

L'URL d'[un fichier zip de jeu de données GTFS](https://gtfs.org/fr/documentation/schedule/reference/#publication-des-jeux-de-donnees-et-pratiques-generales). Un ensemble de données GTFS doit contenir au moins les fichiers suivants.

- agency.txt
- stops.txt
- routes.txt
- trips.txt
- stop_times.txt
- calendar.txt ou calendar_dates.txt
- shapes.txt

### **`id`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Un ID unique de la source de données. Il est utilisé comme clé pour [`Map#addDataSource`](./map.md#adddatasource-source) et [`Map#removeDataSource`](./map.md#removedatasource-id).

### **`trainInfoUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

L'URL des données d'information sur les trains. Pour le format brut ODPT, il s'agit d'une URL de requête [ODPT `odpt:TrainInformation`](https://developer.odpt.org) entièrement développée. En cas d'omission, aucune information sur les trains n'est chargée à partir de cette source de données.

### **`trainUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

L'URL des données de position des trains. Pour le format brut ODPT, il s'agit d'une URL de requête [ODPT `odpt:Train`](https://developer.odpt.org) entièrement développée. En cas d'omission, aucune position de train n'est chargée à partir de cette source de données.

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Pour une source de données GTFS (avec `gtfsUrl`), l'URL d'[un flux VehiclePosition GTFS Realtime](https://gtfs.org/fr/documentation/realtime/reference/#message-vehicleposition). En cas d'omission, les véhicules circuleront selon les horaires.
