import path from 'node:path';
import {fileURLToPath} from 'node:url';
import jsdoc from 'eslint-plugin-jsdoc';
import config from 'eslint-config-mourner';
import {createNodeResolver, importX} from 'eslint-plugin-import-x';
import globals from 'globals';
import {globalIgnores} from 'eslint/config';
import {includeIgnoreFile} from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
    globalIgnores(['src/extend.js']),
    includeIgnoreFile(gitignorePath),

    ...config,
    importX.flatConfigs.recommended,
    jsdoc.configs['flat/recommended'],

    // Settings
    {
        languageOptions: {
            sourceType: 'module',
            ecmaVersion: 2018,
            globals: {
                ...globals.browser
            }
        },

        settings: {
            jsdoc: {
                ignorePrivate: true,
                preferredTypes: {
                    object: 'Object'
                }
            }
        }
    },

    // Default rules
    {
        rules: {
            'arrow-body-style': 'off',
            'consistent-return': 'off',
            'no-lonely-if': 'off',

            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],

            'no-warning-comments': 'error',
            'dot-notation': 'off',
            'no-else-return': 'off',

            'no-mixed-operators': ['error', {
                groups: [['&', '|', '^', '~', '<<', '>>', '>>>'], ['&&', '||']]
            }],

            'prefer-arrow-callback': 'error',

            'prefer-const': ['error', {
                destructuring: 'all'
            }],

            'prefer-template': 'error',
            'no-useless-escape': 'off',

            'no-restricted-syntax': ['error',
                {
                    selector: 'ObjectExpression > SpreadElement',
                    message: 'Spread syntax is not allowed for object assignments. Use Object.assign() or other methods instead.'
                }, {
                    selector: 'ClassProperty[value]',
                    message: 'ClassProperty values are not allowed.'
                }, {
                    selector: 'LogicalExpression[operator=\'??\']',
                    message: 'Nullish coalescing is not allowed.'
                }, {
                    selector: 'ChainExpression',
                    message: 'Optional chaining is now allowed.'
                }
            ]
        }
    },

    // Import plugin rules
    {
        rules: {
            'import-x/no-commonjs': 'error',
            'import-x/no-duplicates': 'error'
        }
    },

    // Stylistic rules
    {
        rules: {
            '@stylistic/implicit-arrow-linebreak': 'off',
            '@stylistic/arrow-parens': 'off',

            '@stylistic/no-confusing-arrow': ['error', {onlyOneSimpleParam: true}],

            '@stylistic/array-bracket-spacing': 'off',
            '@stylistic/object-curly-spacing': ['error', 'never'],
            '@stylistic/quotes': 'off',
            '@stylistic/space-before-function-paren': 'off',
            '@stylistic/template-curly-spacing': 'error',

            '@stylistic/indent': ['error', 4, {
                flatTernaryExpressions: true,
                CallExpression: {arguments: 'off'},
                FunctionDeclaration: {parameters: 'off'},
                FunctionExpression: {parameters: 'off'}
            }],

            'no-multiple-empty-lines': ['error', {max: 1}]
        }
    },

    // JSDoc specific rules
    {
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/no-undefined-types': 'off',
            'jsdoc/require-returns-check': 'off',
            'jsdoc/tag-lines': 'off',
            'jsdoc/reject-function-type': 'off',

            'jsdoc/check-param-names': 'error',
            'jsdoc/require-param': 'error',
            'jsdoc/require-param-description': 'error',
            'jsdoc/require-param-name': 'error',
            'jsdoc/require-returns': 'error',
            'jsdoc/require-returns-description': 'error',
            'jsdoc/require-property': 'error',
            'jsdoc/check-access': 'error',
            'jsdoc/check-line-alignment': ['error', 'any', {wrapIndent: '    '}],
            'jsdoc/check-property-names': 'error',
            'jsdoc/check-types': 'error',
            'jsdoc/require-description': 'error',
            'jsdoc/require-param-type': 'error',
            'jsdoc/require-property-description': 'error',
            'jsdoc/require-property-name': 'error',
            'jsdoc/require-property-type': 'error',
            'jsdoc/require-returns-type': 'error'
        }
    },
];
