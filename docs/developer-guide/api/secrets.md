# Secrets

The `Secrets` object is an object that stores the access tokens used to retrieve data and is set to the [`Map`](./map.md) constructor option `secrets`.

**Type** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## Properties

### **`challenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Access token for the [Open Data Challenge for Public Transportation](https://challenge2026.odpt.org/index-e.html) API hosted at `api-challenge.odpt.org`. It is appended as a consumer key to [data source](./data-source.md) URLs on that host. If not specified, the default token will be used.

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

Access token for the [Public Transportation Open Data Center](https://www.odpt.org/en/) API hosted at `api.odpt.org`. It is appended as a consumer key to [data source](./data-source.md) URLs on that host. If not specified, the default token will be used.
