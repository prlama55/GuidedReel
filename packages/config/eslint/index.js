import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * Shared flat ESLint config.
 * @param {{ react?: boolean; node?: boolean }} [options]
 */
export function createConfig(options = {}) {
  const { react = false } = options;
  return tseslint.config(
    {
      ignores: ['dist/**', 'out/**', '.next/**', 'release/**', 'coverage/**', 'node_modules/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...(react ? [reactHooks.configs.flat.recommended] : []),
    prettier,
    {
      rules: {
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': ['error', { allow: ['warn', 'error'] }],
        // React Compiler-oriented heuristics from eslint-plugin-react-hooks v7. We keep
        // rules-of-hooks and exhaustive-deps; these three flag common, intentional
        // patterns (ResizeObserver → setState, localStorage reads, ref caches in memos).
        ...(react
          ? {
              'react-hooks/set-state-in-effect': 'off',
              'react-hooks/refs': 'off',
              'react-hooks/preserve-manual-memoization': 'off',
            }
          : {}),
      },
    },
  );
}

export default createConfig();
