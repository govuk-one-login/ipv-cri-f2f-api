module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: "module",
  },
  plugins: ["eslint-plugin-tsdoc"],
  extends: [
    "plugin:@typescript-eslint/recommended", // recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    "tsdoc/syntax": "warn",
    "comma-dangle": [
      "warn",
      {
        arrays: "always-multiline",
        exports: "always-multiline",
        functions: "never",
        imports: "always-multiline",
        objects: "always-multiline",
      },
    ],
    indent: 'off',
    '@typescript-eslint/indent': [
      'error',
      'tab',
      { MemberExpression: 1, SwitchCase: 1, ignoredNodes: ['PropertyDefinition'] }
    ],
  },
};
