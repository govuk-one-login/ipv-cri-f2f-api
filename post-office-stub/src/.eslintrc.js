const CODE_COMPLEXITY_RULES = {
  /* Definition can be found at - https://eslint.org/docs/rules/complexity */
  complexity: [
    'warn', {
      max: 10
    }
  ],

  /* Definition can be found at - https://eslint.org/docs/rules/max-depth */
  'max-depth': [
    'warn', {
      max: 4
    }
  ],

  /* Definition can be found at - https://eslint.org/docs/rules/max-len */
  'max-len': [
    'warn', {
      code: 140,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true
    }
  ],

  /* Definition can be found at - https://eslint.org/docs/rules/max-lines */
  'max-lines': [
    'warn', {
      max: 300,
      skipBlankLines: true,
      skipComments: true
    }
  ],

  /* Definition can be found at - https://eslint.org/docs/rules/max-lines-per-function */
  'max-lines-per-function': [
    'warn', {
      max: 30,
      skipBlankLines: true,
      skipComments: true
    }
  ],

  /* Definition can be found at - https://eslint.org/docs/rules/max-lines-per-function */
  'max-params': [
    'warn', {
      max: 4
    }
  ]
}

const CODE_STYLING_RULES = {
  'no-useless-escape': [
    'warn'
  ],
  '@typescript-eslint/dot-notation': [
    'warn'
  ],
  '@typescript-eslint/restrict-plus-operands': [
    'warn'
  ],
  '@typescript-eslint/restrict-template-expressions': [
    'warn'
  ],
  '@typescript-eslint/no-unsafe-return': [
    'warn'
  ],
  '@typescript-eslint/no-unsafe-member-access': [
    'warn'
  ],
  '@typescript-eslint/no-unsafe-assignment': [
    'warn'
  ],
  '@typescript-eslint/no-unsafe-call': [
    'warn'
  ],
  '@typescript-eslint/no-unsafe-argument': [
    'warn'
  ],
  '@typescript-eslint/array-type': [
    'error',
    {
      default: 'array-simple'
    }
  ],
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/ban-types': [
    'error',
    {
      types: {
        Object: {
          message: 'Use {} instead.'
        },
        String: {
          message: "Use 'string' instead."
        },
        Number: {
          message: "Use 'number' instead."
        },
        Boolean: {
          message: "Use 'boolean' instead."
        }
      }
    }
  ],
  '@typescript-eslint/consistent-type-assertions': 'error',
  '@typescript-eslint/consistent-type-definitions': 'off',
  '@typescript-eslint/explicit-member-accessibility': [
    'warn',
    {
      accessibility: 'no-public'
    }
  ],
  '@typescript-eslint/member-delimiter-style': [
    'error',
    {
      multiline: {
        delimiter: 'semi',
        requireLast: true
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false
      }
    }
  ],
  '@typescript-eslint/naming-convention': 'off',
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/no-namespace': 'error',
  '@typescript-eslint/no-unused-expressions': 'error',
  '@typescript-eslint/semi': [
    'error',
    'always'
  ],
  '@typescript-eslint/triple-slash-reference': 'error',
  curly: [
    'error',
    'multi-line'
  ],
  'default-case': 'off',
  'eol-last': 'error',
  eqeqeq: [
    'error',
    'smart'
  ],
  'guard-for-in': 'error',
  'id-denylist': [
    'error',
    'any',
    'Number',
    'number',
    'String',
    'string',
    'Boolean',
    'boolean',
    'Undefined',
    'undefined'
  ],
  'id-match': 'error',
  'import/no-default-export': 'error',
  'import/no-deprecated': 'error',
  'jsdoc/check-alignment': 'error',
  'jsdoc/check-indentation': 'error',
  'jsdoc/newline-after-description': 'error',
  'new-parens': 'error',
  'no-caller': 'error',
  'no-cond-assign': 'error',
  'no-debugger': 'error',
  'import/named': 'warn',
  '@typescript-eslint/no-unused-vars': 'warn',
  // "no-extra-parens": ["error", "all", { "nestedBinaryExpressions": false }],
  'no-multi-spaces': [
    'error', {
      exceptions: {
        BinaryExpression: true,
        VariableDeclarator: true,
        ImportDeclaration: true
      }
    }
  ],
  'no-multiple-empty-lines': [
    'error', {
      max: 2,
      maxEOF: 1,
      maxBOF: 0
    }
  ],
  'no-new-wrappers': 'error',
  'no-redeclare': 'error',
  'no-return-await': 'error',
  'no-throw-literal': 'error',
  'no-underscore-dangle': 'error',
  'no-unsafe-finally': 'error',
  'no-unused-expressions': 'error',
  'no-unused-labels': 'error',
  'no-var': 'error',
  'no-whitespace-before-property': 'error',
  'object-shorthand': 'error',
  'object-property-newline': [
    'error', {
      allowAllPropertiesOnSameLine: true
    }
  ],
  'prefer-arrow/prefer-arrow-functions': 'off',
  'prefer-const': 'error',
  radix: 'error',
  'require-await': 'off',
  semi: 'error',
  'use-isnan': 'error',
  indent: 'off',
  '@typescript-eslint/indent': [
    'error',
    'tab',
    { MemberExpression: 1, SwitchCase: 1, ignoredNodes: ['PropertyDefinition'] }
  ],
  'space-infix-ops': ['error', { int32Hint: false }],
  'space-before-blocks': 'error',
  'keyword-spacing': 'error',
  //  "key-spacing": [
  //      "warn", {
  //          align: "value"
  //      }
  // ],
  quotes: 'off',
  '@typescript-eslint/quotes': [
    'error',
    'double',
    'avoid-escape'
  ],
  // "computed-property-spacing": ["error", "always"],
  'comma-spacing': 'error',
  'semi-spacing': 'error',
  'rest-spread-spacing': 'error',
  '@typescript-eslint/tslint/config': [
    'error',
    {
      rules: {
        ban: [
          true,
          {
            name: [
              'it',
              'skip'
            ]
          },
          {
            name: [
              'it',
              'only'
            ]
          },
          {
            name: [
              'it',
              'async',
              'skip'
            ]
          },
          {
            name: [
              'it',
              'async',
              'only'
            ]
          },
          {
            name: [
              'describe',
              'skip'
            ]
          },
          {
            name: [
              'describe',
              'only'
            ]
          },
          {
            name: 'parseInt',
            message: 'tsstyle#type-coercion'
          },
          {
            name: 'parseFloat',
            message: 'tsstyle#type-coercion'
          },
          {
            name: 'Array',
            message: 'tsstyle#array-constructor'
          },
          {
            name: [
              '*',
              'innerText'
            ],
            message: 'Use .textContent instead. tsstyle#browser-oddities'
          }
        ],
        'prefer-method-signature': true,
        typedef: [
          true,
          'call-signature',
          'property-declaration'
        ]
      }
    }
  ]
}

const JEST_RULES = {
  // @see https://github.com/jest-community/eslint-plugin-jest/blob/v25.3.0/docs/rules/no-hooks.md
  // Enable use of hooks (beforeEach/afterEach) - state is useful in most testsuites
  'jest/no-hooks': 'off',

  // @see https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/require-top-level-describe.md
  'jest/require-top-level-describe': 'error',

  'jest/prefer-expect-resolves': 'error',

  'jest/no-alias-methods': 'error',

  'jest/consistent-test-it': [
    'error', {
      fn: 'it'
    }
  ]
}

const OVERRIDE_DEFAULTS_RULES = {
  // Allow defining functions (incl. arrow expressions) after use as per "Stepdown Rule" best practice
  '@typescript-eslint/no-use-before-define': 'off',

  // Allow referencing unbound methods as long as they are static
  '@typescript-eslint/unbound-method': [
    'error', {
      ignoreStatic: true
    }
  ],

  // Allows you to use imports which cant be resolved, enabled for everything not in the ignore list.
  'import/no-unresolved': [
    2, {
      ignore: [
        'aws-sdk',
        'aws-lambda'
      ]
    }
  ],

  'import/no-extraneous-dependencies': [
    'warn'
  ],

  // Stops us from having to declare class methods which dont use this as static.
  'class-methods-use-this': 'off',

  // Allow named exports where there is only one module export
  'import/prefer-default-export': 'off'
}

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier',
    'airbnb-typescript/base',
    'plugin:import/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.eslint.json', 'tsconfig.json'],
    sourceType: 'module'
  },
  plugins: [
    'import',
    'eslint-plugin-jsdoc',
    'eslint-plugin-prefer-arrow',
    '@typescript-eslint',
    '@typescript-eslint/tslint',
    'jest',
    'security'
  ],
  ignorePatterns: ['**/*.js', '/dist', '**/*.d.ts', '/**/*.config.ts', '/**/*.setup.ts', '/__tests__'],
  rules: {
    ...CODE_COMPLEXITY_RULES,
    ...CODE_STYLING_RULES,
    ...JEST_RULES,
    ...OVERRIDE_DEFAULTS_RULES
  }
}
