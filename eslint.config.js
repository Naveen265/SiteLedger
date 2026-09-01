import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Lint rules.
 * Two of these enforce product rules rather than style: the ban on `any`, and
 * the ban on importing the Supabase service role key, which must never reach
 * anything that runs in a browser.
 */
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // The service role key bypasses Row Level Security. It must never appear
      // in anything that ships to a browser, which is this entire application.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/SUPABASE_SERVICE_ROLE_KEY/]",
          message:
            'The service role key bypasses Row Level Security and must never appear in client code.',
        },
      ],
    },
  },
  {
    // Placed last so it overrides the rule above: flat config is order
    // sensitive. api/ runs on the server and is the one place the service role
    // key may legitimately be read. The ban stays in force for everything that
    // ships to a browser.
    files: ['api/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
