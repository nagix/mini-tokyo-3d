(window.webpackJsonp=window.webpackJsonp||[]).push([[35],{320:function(t,e,a){"use strict";a.r(e);var s=a(14),n=Object(s.a)({},(function(){var t=this,e=t._self._c;return e("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[e("h1",{attrs:{id:"building-mini-tokyo-3d"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#building-mini-tokyo-3d"}},[t._v("#")]),t._v(" Building Mini Tokyo 3D")]),t._v(" "),e("p",[t._v("If you want to try out the latest features before they are released, modify the code yourself, or contribute to Mini Tokyo 3D development, you can build your project from source code by following the instructions in this section.")]),t._v(" "),e("h2",{attrs:{id:"preparation-for-build"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#preparation-for-build"}},[t._v("#")]),t._v(" Preparation for Build")]),t._v(" "),e("p",[t._v("The following software are required.")]),t._v(" "),e("ul",[e("li",[t._v("The latest version of "),e("a",{attrs:{href:"https://nodejs.org",target:"_blank",rel:"noopener noreferrer"}},[t._v("Node.js"),e("OutboundLink")],1)]),t._v(" "),e("li",[t._v("The latest version of "),e("a",{attrs:{href:"https://git-scm.com",target:"_blank",rel:"noopener noreferrer"}},[t._v("Git"),e("OutboundLink")],1),t._v(" if you're cloning the repository")])]),t._v(" "),e("h2",{attrs:{id:"build-instructions"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#build-instructions"}},[t._v("#")]),t._v(" Build Instructions")]),t._v(" "),e("h3",{attrs:{id:"_1-downloading-files"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_1-downloading-files"}},[t._v("#")]),t._v(" 1. Downloading Files")]),t._v(" "),e("p",[t._v("Download the latest "),e("code",[t._v("master")]),t._v(" branch from Mini Tokyo 3D's "),e("a",{attrs:{href:"https://github.com/nagix/mini-tokyo-3d",target:"_blank",rel:"noopener noreferrer"}},[t._v("GitHub repository"),e("OutboundLink")],1),t._v(" and extract the zip file. A directory named "),e("code",[t._v("mini-tokyo-3d-master")]),t._v(" will be created, so change the name to "),e("code",[t._v("mini-tokyo-3d")]),t._v(".")]),t._v(" "),e("div",{staticClass:"language-bash extra-class"},[e("pre",{pre:!0,attrs:{class:"language-bash"}},[e("code",[e("span",{pre:!0,attrs:{class:"token function"}},[t._v("curl")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token parameter variable"}},[t._v("-LO")]),t._v(" https://github.com/nagix/mini-tokyo-3d/archive/master.zip\n"),e("span",{pre:!0,attrs:{class:"token function"}},[t._v("unzip")]),t._v(" master.zip\n"),e("span",{pre:!0,attrs:{class:"token function"}},[t._v("mv")]),t._v(" mini-tokyo-3d-master mini-tokyo-3d\n")])])]),e("p",[t._v("If you are using Git, you can clone the repository directly from GitHub instead of the above commands.")]),t._v(" "),e("div",{staticClass:"language-bash extra-class"},[e("pre",{pre:!0,attrs:{class:"language-bash"}},[e("code",[e("span",{pre:!0,attrs:{class:"token function"}},[t._v("git")]),t._v(" clone https://github.com/nagix/mini-tokyo-3d.git\n")])])]),e("h3",{attrs:{id:"_2-build"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#_2-build"}},[t._v("#")]),t._v(" 2. Build")]),t._v(" "),e("p",[t._v("Go to the top directory of Mini Tokyo 3D.")]),t._v(" "),e("div",{staticClass:"language-bash extra-class"},[e("pre",{pre:!0,attrs:{class:"language-bash"}},[e("code",[e("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v("cd")]),t._v(" mini-tokyo-3d\n")])])]),e("p",[t._v("Install the dependent npm modules.")]),t._v(" "),e("div",{staticClass:"language-bash extra-class"},[e("pre",{pre:!0,attrs:{class:"language-bash"}},[e("code",[e("span",{pre:!0,attrs:{class:"token function"}},[t._v("npm")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token function"}},[t._v("install")]),t._v("\n")])])]),e("p",[t._v("Build the project with the following command.")]),t._v(" "),e("div",{staticClass:"language-bash extra-class"},[e("pre",{pre:!0,attrs:{class:"language-bash"}},[e("code",[e("span",{pre:!0,attrs:{class:"token function"}},[t._v("npm")]),t._v(" run build-all\n")])])]),e("p",[t._v("When the build completes successfully, the "),e("code",[t._v("dist")]),t._v(" directory will be created. It includes style sheet and JavaScript files for distribution. The "),e("code",[t._v("build")]),t._v(" directory will also be created at the same time. It contains all the files needed for deployment on your web site.")]),t._v(" "),e("h2",{attrs:{id:"deploying-on-a-web-site"}},[e("a",{staticClass:"header-anchor",attrs:{href:"#deploying-on-a-web-site"}},[t._v("#")]),t._v(" Deploying on a Web Site")]),t._v(" "),e("p",[t._v("You need access tokens for the data sources to deploy and use the built files on your web site. See "),e("RouterLink",{attrs:{to:"/developer-guide/integration.html#preparation-for-use"}},[t._v("Preparation for Use")]),t._v(" to obtain access tokens for Public Transportation Open Data Center, Open Data Challenge for Public Transportation 2024, and Mapbox.")],1),t._v(" "),e("p",[t._v("The "),e("code",[t._v("index.html")]),t._v(" in the "),e("code",[t._v("build")]),t._v(" directory is for the web page on "),e("a",{attrs:{href:"http://minitokyo3d.com",target:"_blank",rel:"noopener noreferrer"}},[t._v("https://minitokyo3d.com"),e("OutboundLink")],1),t._v(". In "),e("code",[t._v("index.html")]),t._v(", add the "),e("code",[t._v("accessToken")]),t._v(" and "),e("code",[t._v("secrets")]),t._v(" properties to the object passed to the "),e("code",[t._v("Map")]),t._v(" constructor, and specify the Mapbox access token for the "),e("code",[t._v("accessToken")]),t._v(" and the access tokens for Public Transportation Open Data Center and Open Data Challenge for Public Transportation 2024 for the "),e("code",[t._v("secrets")]),t._v(".")]),t._v(" "),e("div",{staticClass:"language-js extra-class"},[e("pre",{pre:!0,attrs:{class:"language-js"}},[e("code",[t._v("map "),e("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("new")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token class-name"}},[t._v("mt3d"),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Map")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  "),e("span",{pre:!0,attrs:{class:"token comment"}},[t._v("/* ... */")]),t._v("\n  "),e("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("accessToken")]),e("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token string"}},[t._v("'<Mapbox access token>'")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  "),e("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("secrets")]),e("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),e("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("odpt")]),e("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token string"}},[t._v("'<access token for Public Transportation Open Data Center>'")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n    "),e("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("challenge2024")]),e("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),e("span",{pre:!0,attrs:{class:"token string"}},[t._v("'<access token for Open Data Challenge for Public Transportation 2024>'")]),t._v("\n  "),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n"),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),e("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(";")]),t._v("\n")])])]),e("p",[t._v("Then, edit it for your web site, and place all the files in the "),e("code",[t._v("build")]),t._v(" directory in the public directory of your web server.")]),t._v(" "),e("div",{staticClass:"custom-block warning"},[e("p",{staticClass:"custom-block-title"},[t._v("WARNING")]),t._v(" "),e("p",[t._v("Since "),e("code",[t._v("index.html")]),t._v(" also uses the Mini Tokyo 3D "),e("RouterLink",{attrs:{to:"/user-guide/plugins.html"}},[t._v("plugins")]),t._v(", you must separately build the JavaScript files for each plugin and place them in the "),e("code",[t._v("build")]),t._v(" directory.")],1)])])}),[],!1,null,null,null);e.default=n.exports}}]);