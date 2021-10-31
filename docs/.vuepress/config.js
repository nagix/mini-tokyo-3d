module.exports = {
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
    }
  },
  head: [
    ['meta', { name: 'theme-color', content: '#b31166' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
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
                'build'
              ]
            },
            {
              title: 'API Reference',
              collapsable: false,
              children: [
                'api/',
                'api/map',
                'api/mapboxgl',
                'api/marker',
                'api/panel',
                'api/plugin',
                'api/popup',
                'api/secrets',
                'api/three',
                'api/three-layer'
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
                'build'
              ]
            },
            {
              title: 'API リファレンス',
              collapsable: false,
              children: [
                'api/',
                'api/map',
                'api/mapboxgl',
                'api/marker',
                'api/panel',
                'api/plugin',
                'api/popup',
                'api/secrets',
                'api/three',
                'api/three-layer'
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
    ['flexsearch'],
    ['@vuepress/google-analytics', {
      ga: 'UA-39988758-3'
    }]
  ]
}
