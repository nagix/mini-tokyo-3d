# Secrets

The `Secrets` object is an object that stores the access tokens used to retrieve data and is set to the [`Map`](./map.md) constructor option `secrets`.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Properties

### **`challenge2024`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Access token for the [Open Data Challenge for Public Transportation 2024](https://challenge2024.odpt.org/index-e.html). If not specified, the default token will be used.

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))

Access token for the [Public Transportation Open Data Center](https://www.odpt.org/en/). If not specified, the default token will be used.

### **`tokyochallenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Access token for the [Open Data Challenge for Public Transportation in Tokyo](https://tokyochallenge.odpt.org/en/). If not specified, the default token will be used.

::: warning
Due to the end of the Open Data Challenge for Public Transportation in Tokyo, this parameter is no longer used from the version 3.1 onwards.
:::
