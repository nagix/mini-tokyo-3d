const path = require('path');

module.exports = {
    // webpack-dev-server 3's client uses the html-entities v1 API (AllHtmlEntities),
    // but eslint-plugin-jsdoc hoists html-entities v2 to the top level, which the
    // dev client bundle would otherwise pick up. Alias html-entities to the v1 copy
    // bundled with webpack-dev-server so the dev client works.
    configureWebpack: {
        resolve: {
            alias: {
                'html-entities$': path.resolve(__dirname, '../../node_modules/webpack-dev-server/node_modules/html-entities')
            }
        }
    },
    dest: 'build/docs/master',
    title: 'Mini Tokyo 3D',
    base: '/docs/master/',
    locales: {
        '/': {
            lang: 'en-US',
            description: 'A real-time 3D digital map of Tokyo\'s public transport system'
        },
        '/ja/': {
            lang: 'ja-JP',
            description: '東京の公共交通のリアルタイム3Dデジタルマップ'
        },
        '/fr/': {
            lang: 'fr-FR',
            description: 'Une carte numérique 3D en temps réel du système de transports publics de Tokyo'
        },
        '/zh-Hans/': {
            lang: 'zh-CN',
            description: '东京公共交通系统的实时 3D 数字地图'
        }
    },
    head: [
        ['meta', {name: 'theme-color', content: '#b31166'}],
        ['meta', {name: 'apple-mobile-web-app-capable', content: 'yes'}],
        ['meta', {name: 'apple-mobile-web-app-status-bar-style', content: 'black'}],
        ['script', {async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-7NP0LHFG11'}],
        ['script', {}, ["window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-7NP0LHFG11');"]]
    ],
    themeConfig: {
        repo: 'nagix/mini-tokyo-3d',
        editLinks: false,
        docsDir: 'docs',
        logo: '/images/icon.png',
        locales: {
            '/': {
                label: 'English',
                selectText: 'Languages',
                lastUpdated: 'Last Updated',
                nav: [
                    {
                        text: 'User Guide',
                        link: '/user-guide/',
                    },
                    {
                        text: 'Developer Guide',
                        link: '/developer-guide/'
                    },
                    {
                        text: 'Live Demo',
                        link: 'https://minitokyo3d.com'
                    }
                ],
                sidebar: {
                    '/user-guide/': [
                        {
                            title: 'User Guide',
                            collapsable: false,
                            children: [
                                '',
                                'overview',
                                'screen-and-operations',
                                'display-modes',
                                'configuration',
                                'plugins',
                                'gtfs',
                                'about-data',
                                'supported-browsers',
                                'development-information',
                                'contact'
                            ]
                        }
                    ],
                    '/developer-guide/': [
                        {
                            title: 'Developer Guide',
                            collapsable: false,
                            children: [
                                '',
                                'integration',
                                'build',
                                'migration'
                            ]
                        },
                        {
                            title: 'API Reference',
                            collapsable: false,
                            children: [
                                'api/',
                                'api/data-source',
                                'api/geojson-layer',
                                'api/map',
                                'api/mapboxgl',
                                'api/marker',
                                'api/panel',
                                'api/plugin',
                                'api/popup',
                                'api/secrets',
                                'api/three',
                                'api/three-layer',
                                'api/tile-3d-layer'
                            ]
                        }
                    ]
                }
            },
            '/ja/': {
                label: '日本語',
                selectText: '言語',
                lastUpdated: '最終更新日時',
                nav: [
                    {
                        text: 'ユーザーガイド',
                        link: '/ja/user-guide/',
                    },
                    {
                        text: '開発者ガイド',
                        link: '/ja/developer-guide/'
                    },
                    {
                        text: 'ライブデモ',
                        link: 'https://minitokyo3d.com'
                    }
                ],
                sidebar: {
                    '/ja/user-guide/': [
                        {
                            title: 'ユーザーガイド',
                            collapsable: false,
                            children: [
                                '',
                                'overview',
                                'screen-and-operations',
                                'display-modes',
                                'configuration',
                                'plugins',
                                'gtfs',
                                'about-data',
                                'supported-browsers',
                                'development-information',
                                'contact'
                            ]
                        }
                    ],
                    '/ja/developer-guide/': [
                        {
                            title: '開発者ガイド',
                            collapsable: false,
                            children: [
                                '',
                                'integration',
                                'build',
                                'migration'
                            ]
                        },
                        {
                            title: 'API リファレンス',
                            collapsable: false,
                            children: [
                                'api/',
                                'api/data-source',
                                'api/geojson-layer',
                                'api/map',
                                'api/mapboxgl',
                                'api/marker',
                                'api/panel',
                                'api/plugin',
                                'api/popup',
                                'api/secrets',
                                'api/three',
                                'api/three-layer',
                                'api/tile-3d-layer'
                            ]
                        }
                    ]
                }
            },
            '/fr/': {
                label: 'Français',
                selectText: 'Langues',
                lastUpdated: 'Dernière mise à jour',
                nav: [
                    {
                        text: 'Guide d\'utilisation',
                        link: '/fr/user-guide/',
                    },
                    {
                        text: 'Guide de développement',
                        link: '/fr/developer-guide/'
                    },
                    {
                        text: 'Démo en direct',
                        link: 'https://minitokyo3d.com'
                    }
                ],
                sidebar: {
                    '/fr/user-guide/': [
                        {
                            title: 'Guide d\'utilisation',
                            collapsable: false,
                            children: [
                                '',
                                'overview',
                                'screen-and-operations',
                                'display-modes',
                                'configuration',
                                'plugins',
                                'gtfs',
                                'about-data',
                                'supported-browsers',
                                'development-information',
                                'contact'
                            ]
                        }
                    ],
                    '/fr/developer-guide/': [
                        {
                            title: 'Guide de développement',
                            collapsable: false,
                            children: [
                                '',
                                'integration',
                                'build',
                                'migration'
                            ]
                        },
                        {
                            title: 'Référence API',
                            collapsable: false,
                            children: [
                                'api/',
                                'api/data-source',
                                'api/geojson-layer',
                                'api/map',
                                'api/mapboxgl',
                                'api/marker',
                                'api/panel',
                                'api/plugin',
                                'api/popup',
                                'api/secrets',
                                'api/three',
                                'api/three-layer',
                                'api/tile-3d-layer'
                            ]
                        }
                    ]
                }
            },
            '/zh-Hans/': {
                label: '简体中文',
                selectText: '语言',
                lastUpdated: '最后更新',
                nav: [
                    {
                        text: '用户指南',
                        link: '/zh-Hans/user-guide/'
                    },
                    {
                        text: '开发者指南',
                        link: '/zh-Hans/developer-guide/'
                    },
                    {
                        text: '在线演示',
                        link: 'https://minitokyo3d.com'
                    }
                ],
                sidebar: {
                    '/zh-Hans/user-guide/': [
                        {
                            title: '用户指南',
                            collapsable: false,
                            children: [
                                '',
                                'overview',
                                'screen-and-operations',
                                'display-modes',
                                'configuration',
                                'plugins',
                                'gtfs',
                                'about-data',
                                'supported-browsers',
                                'development-information',
                                'contact'
                            ]
                        }
                    ],
                    '/zh-Hans/developer-guide/': [
                        {
                            title: '开发者指南',
                            collapsable: false,
                            children: [
                                '',
                                'integration',
                                'build',
                                'migration'
                            ]
                        },
                        {
                            title: 'API 参考',
                            collapsable: false,
                            children: [
                                'api/',
                                'api/data-source',
                                'api/geojson-layer',
                                'api/map',
                                'api/mapboxgl',
                                'api/marker',
                                'api/panel',
                                'api/plugin',
                                'api/popup',
                                'api/secrets',
                                'api/three',
                                'api/three-layer',
                                'api/tile-3d-layer'
                            ]
                        }
                    ]
                }
            }
        }
    },

    /**
     * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
     */
    plugins: [
        ['flexsearch']
    ]
};
