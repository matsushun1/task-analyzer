// eslint.config.cjs
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      // 文末セミコロン禁止
      semi: ['error', 'never'],
      // any型禁止
      '@typescript-eslint/no-explicit-any': 'error',
      // default export禁止
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'default exportは禁止です。named exportを使用してください。',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            '*.js',
            '*.cjs',
            '*.mjs',
            'tests/*.ts',
            'tests/*/*.ts',
            'tests/*/*/*.ts',
            'tests/*/*/*/*.ts',
          ],
          defaultProject: 'tests/tsconfig.json',
        },
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**'],
  }
);
