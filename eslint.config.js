import globals from 'globals';
import pluginJs from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...typescriptEslint.configs.recommended,
  eslintPluginPrettier,
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
        },
      ],
    },
  },
];
