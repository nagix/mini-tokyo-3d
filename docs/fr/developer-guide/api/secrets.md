# Secrets

L'objet `Secrets` est un objet qui stocke les jetons d'accès utilisés pour récupérer les données et est défini sur l'option du constructeur [`Map`](./map.md) `secrets`.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

### **`challenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Jeton d'accès pour l'API [Open Data Challenge for Public Transportation](https://challenge2026.odpt.org/index-e.html) hébergée sur `api-challenge.odpt.org`. Il est ajouté comme clé de consommateur aux URL des [sources de données](./data-source.md) sur cet hôte. S’il n’est pas spécifié, le jeton par défaut sera utilisé.

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Jeton d'accès pour l'API [Public Transportation Open Data Center](https://www.odpt.org/en/) hébergée sur `api.odpt.org`. Il est ajouté comme clé de consommateur aux URL des [sources de données](./data-source.md) sur cet hôte. S’il n’est pas spécifié, le jeton par défaut sera utilisé.