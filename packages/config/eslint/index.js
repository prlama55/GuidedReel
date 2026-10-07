import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

/**
 * Shared flat ESLint config.
 * @param {{ react?: boolean; node?: boolean; app?: boolean }} [options]
 *   `app`: the package is an application shell. It may only reach the engine through
 *   `@guidedreel/core` and must never import Remotion directly.
 */
export function createConfig(options = {}) {
  const { react = false, app = false } = options;
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
        ...(app
          ? {
              'no-restricted-imports': [
                'error',
                {
                  patterns: [
                    {
                      group: ['remotion', 'remotion/*', '@remotion/*'],
                      message:
                        'Apps never use Remotion directly. Import from @guidedreel/core instead.',
                    },
                    {
                      group: ['@guidedreel/*', '!@guidedreel/core', '!@guidedreel/core/*'],
                      message:
                        'Apps depend on @guidedreel/core only. Use @guidedreel/core, /ui, /render, /storage or /providers.',
                    },
                  ],
                },
              ],
            }
          : {}),
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
