# Secrets

`Secrets` 对象用于存储获取数据时使用的访问令牌，并设置到 [`Map`](./map.md) 构造函数选项 `secrets` 中。

**类型** [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)

## 属性

### **`challenge`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

托管在 `api-challenge.odpt.org` 上的[公共交通开放数据挑战赛](https://challenge2026.odpt.org/) API 访问令牌。它会作为 consumer key 附加到该主机上的[数据源](./data-source.md)网址中。省略时使用默认令牌。

### **`odpt`** ([`string`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String))

托管在 `api.odpt.org` 上的[公共交通开放数据中心](https://www.odpt.org/) API 访问令牌。它会作为 consumer key 附加到该主机上的[数据源](./data-source.md)网址中。省略时使用默认令牌。
