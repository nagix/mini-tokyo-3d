# Secrets

L'objet `Secrets` est un objet qui stocke les jetons d'accès utilisés pour récupérer les données et est défini sur l'option du constructeur [`Map`](./map.md) `secrets`.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Propriétés

### **`challenge2024`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Jeton d'accès pour le [Open Data Challenge for Public Transportation 2024](https://challenge2024.odpt.org/index-e.html). S’il n’est pas spécifié, le jeton par défaut sera utilisé.

::: warning
En raison de la fin de l'Open Data Challenge for Public Transportation 2024, ce paramètre n'est plus utilisé à partir de la version 4.0.
:::

### **`challenge2025`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Jeton d'accès pour le [Open Data Challenge for Public Transportation 2025](https://challenge2025.odpt.org/index-e.html). S’il n’est pas spécifié, le jeton par défaut sera utilisé.

::: warning
En raison de la fin de l'Open Data Challenge for Public Transportation 2025, ce paramètre n'est plus utilisé à partir de la version 4.0.
:::

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Jeton d'accès pour le [Public Transportation Open Data Center](https://www.odpt.org/en/). S’il n’est pas spécifié, le jeton par défaut sera utilisé.

### **`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Jeton d'accès pour le [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). S’il n’est pas spécifié, le jeton par défaut sera utilisé.

::: warning
En raison de la fin de l'Open Data Challenge for Public Transportation à Tokyo, ce paramètre n'est plus utilisé à partir de la version 3.1.
:::