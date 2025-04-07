(window.webpackJsonp=window.webpackJsonp||[]).push([[32],{318:function(e,t,r){"use strict";r.r(t);var a=r(14),o=Object(a.a)({},(function(){var e=this,t=e._self._c;return t("ContentSlotsDistributor",{attrs:{"slot-key":e.$parent.slotKey}},[t("h1",{attrs:{id:"threelayerinterface"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#threelayerinterface"}},[e._v("#")]),e._v(" ThreeLayerInterface")]),e._v(" "),t("p",[e._v("Interface for custom three.js layers. This is a specification for implementers to model: it is not an exported method or class.")]),e._v(" "),t("p",[e._v("A custom three.js layer contains a "),t("a",{attrs:{href:"https://threejs.org/docs/",target:"_blank",rel:"noopener noreferrer"}},[e._v("three.js"),t("OutboundLink")],1),e._v(" scene. It allows a developer to render three.js objects directly into the map's GL context using the map's camera. These layers can be added to the map using "),t("RouterLink",{attrs:{to:"/developer-guide/api/map.html#addlayer-layer"}},[e._v("Map#addLayer")]),e._v(".")],1),e._v(" "),t("p",[e._v("Custom three.js layers must have a unique "),t("code",[e._v("id")]),e._v(" and must have the "),t("code",[e._v("type")]),e._v(" of "),t("code",[e._v("'three'")]),e._v(". They may implement "),t("code",[e._v("onAdd")]),e._v(" and "),t("code",[e._v("onRemove")]),e._v(".")]),e._v(" "),t("h2",{attrs:{id:"properties"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#properties"}},[e._v("#")]),e._v(" Properties")]),e._v(" "),t("h3",{attrs:{id:"id-string"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#id-string"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("id")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("string")]),t("OutboundLink")],1),e._v(")")]),e._v(" "),t("p",[e._v("A unique layer id.")]),e._v(" "),t("h3",{attrs:{id:"lightcolor-number-color-string"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#lightcolor-number-color-string"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("lightColor")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("number")]),t("OutboundLink")],1),e._v(" | "),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/math/Color",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("Color")]),t("OutboundLink")],1),e._v(" | "),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("string")]),t("OutboundLink")],1),e._v(")")]),e._v(" "),t("p",[e._v("A color of the lights. It can be a hexadecimal color, a three.js "),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/math/Color",target:"_blank",rel:"noopener noreferrer"}},[e._v("Color"),t("OutboundLink")],1),e._v(" instance or a CSS-style string. If not specified, the dynamic light color based on the current date and time will be used.")]),e._v(" "),t("h3",{attrs:{id:"maxzoom-number"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#maxzoom-number"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("maxzoom")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("number")]),t("OutboundLink")],1),e._v(")")]),e._v(" "),t("p",[e._v("The maximum zoom level for the layer. At zoom levels equal to or greater than the maxzoom, the layer will be hidden. The value can be any number between "),t("code",[e._v("0")]),e._v(" and "),t("code",[e._v("24")]),e._v(" (inclusive). If no maxzoom is provided, the layer will be visible at all zoom levels.")]),e._v(" "),t("h3",{attrs:{id:"minzoom-number"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#minzoom-number"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("minzoom")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("number")]),t("OutboundLink")],1),e._v(")")]),e._v(" "),t("p",[e._v("The minimum zoom level for the layer. At zoom levels less than the minzoom, the layer will be hidden. The value can be any number between "),t("code",[e._v("0")]),e._v(" and "),t("code",[e._v("24")]),e._v(" (inclusive). If no minzoom is provided, the layer will be visible at all zoom levels.")]),e._v(" "),t("h3",{attrs:{id:"type-string"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#type-string"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("type")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("string")]),t("OutboundLink")],1),e._v(")")]),e._v(" "),t("p",[e._v("The layer's type. Must be "),t("code",[e._v("'three'")]),e._v(".")]),e._v(" "),t("h2",{attrs:{id:"instance-members"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#instance-members"}},[e._v("#")]),e._v(" Instance Members")]),e._v(" "),t("h3",{attrs:{id:"onadd-map-context"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#onadd-map-context"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("onAdd(map, context)")])])]),e._v(" "),t("p",[e._v("Optional method called when the layer has been added to the Map with "),t("RouterLink",{attrs:{to:"/developer-guide/api/map.html#addlayer-layer"}},[e._v("Map#addLayer")]),e._v(". This gives the layer a chance to initialize three.js resources and register event listeners.")],1),e._v(" "),t("h4",{attrs:{id:"parameters"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#parameters"}},[e._v("#")]),e._v(" Parameters")]),e._v(" "),t("p",[t("strong",[t("code",[e._v("map")])]),e._v(" ("),t("RouterLink",{attrs:{to:"/developer-guide/api/map.html"}},[t("code",[e._v("Map")])]),e._v(") The Mini Tokyo 3D Map this layer was just added to.")],1),e._v(" "),t("p",[t("strong",[t("code",[e._v("context")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("Object")]),t("OutboundLink")],1),e._v(") three.js renderer, scene and camera this layer contains.")]),e._v(" "),t("table",[t("thead",[t("tr",[t("th",{staticStyle:{"text-align":"left"}},[e._v("Name")]),e._v(" "),t("th",{staticStyle:{"text-align":"left"}},[e._v("Description")])])]),e._v(" "),t("tbody",[t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.camera")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/cameras/PerspectiveCamera",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("PerspectiveCamera")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Camera object.")])]),e._v(" "),t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.renderer")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/renderers/WebGLRenderer",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("WebGLRenderer")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Renderer object.")])]),e._v(" "),t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.scene")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/scenes/Scene",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("Scene")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Scene object.")])])])]),e._v(" "),t("hr"),e._v(" "),t("h3",{attrs:{id:"onremove-map-context"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#onremove-map-context"}},[e._v("#")]),e._v(" "),t("strong",[t("code",[e._v("onRemove(map, context)")])])]),e._v(" "),t("p",[e._v("Optional method called when the layer has been removed from the Map with "),t("RouterLink",{attrs:{to:"/developer-guide/api/map.html#removelayer-id"}},[e._v("Map#removeLayer")]),e._v(". This gives the layer a chance to clean up three.js resources and event listeners.")],1),e._v(" "),t("h4",{attrs:{id:"parameters-2"}},[t("a",{staticClass:"header-anchor",attrs:{href:"#parameters-2"}},[e._v("#")]),e._v(" Parameters")]),e._v(" "),t("p",[t("strong",[t("code",[e._v("map")])]),e._v(" ("),t("RouterLink",{attrs:{to:"/developer-guide/api/map.html"}},[t("code",[e._v("Map")])]),e._v(") The Mini Tokyo 3D Map this layer was just removed from.")],1),e._v(" "),t("p",[t("strong",[t("code",[e._v("context")])]),e._v(" ("),t("a",{attrs:{href:"https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("Object")]),t("OutboundLink")],1),e._v(") three.js renderer, scene and camera this layer contains.")]),e._v(" "),t("table",[t("thead",[t("tr",[t("th",{staticStyle:{"text-align":"left"}},[e._v("Name")]),e._v(" "),t("th",{staticStyle:{"text-align":"left"}},[e._v("Description")])])]),e._v(" "),t("tbody",[t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.camera")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/cameras/PerspectiveCamera",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("PerspectiveCamera")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Camera object.")])]),e._v(" "),t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.renderer")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/renderers/WebGLRenderer",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("WebGLRenderer")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Renderer object.")])]),e._v(" "),t("tr",[t("td",{staticStyle:{"text-align":"left"}},[t("strong",[t("code",[e._v("context.scene")])]),t("br"),t("a",{attrs:{href:"https://threejs.org/docs/#api/en/scenes/Scene",target:"_blank",rel:"noopener noreferrer"}},[t("code",[e._v("Scene")]),t("OutboundLink")],1)]),e._v(" "),t("td",{staticStyle:{"text-align":"left"}},[e._v("Scene object.")])])])])])}),[],!1,null,null,null);t.default=o.exports}}]);