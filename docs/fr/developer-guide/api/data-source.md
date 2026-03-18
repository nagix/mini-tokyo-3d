# Source de données

L'objet `DataSource` est utilisé pour spécifier des sources de données [GTFS](https://gtfs.org) (General Transit Feed Spécification) et GTFS Realtime supplémentaires, définies sous forme de tableau dans l'option de constructeur [`Map`](./map.md) `dataSources`.

::: warning
Notez qu'il s'agit d'une fonctionnalité expérimentale en cours de développement et susceptible de changer.
:::

**Tapez** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

### **`color`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Une couleur utilisée pour afficher les itinéraires et les véhicules. Il est spécifié par un code couleur hexadécimal commençant par `#`.

### **`gtfsUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Spécifie l'URL de [a GTFS dataset zip file](https://gtfs.org/documentation/schedule/reference/#dataset-publishing-general-practices). Un ensemble de données GTFS doit contenir au moins les fichiers suivants.

- agence.txt
- arrête.txt
- routes.txt
- voyages.txt
- stop_times.txt
- calendrier.txt ou calendrier_dates.txt
- formes.txt

### **`vehiclePositionUrl`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Spécifie l'URL de [a GTFS Realtime VehiclePosition feed](https://gtfs.org/documentation/realtime/reference/#message-vehicleposition). En cas d'omission, les véhicules circuleront selon les horaires.