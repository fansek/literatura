import globals from 'globals';
import pluginJs from '@eslint/js';
import typescriptEslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...typescriptEslint.configs.recommended,
];
