import { createConfig } from '@guidedreel/config/eslint';
export default [
  ...createConfig({ react: true }),
  {
    rules: {
      // The shared UI must run in both Next.js and Electron.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['next', 'next/*', 'electron', 'electron/*'],
              message: 'packages/ui must not depend on Next.js or Electron',
            },
          ],
        },
      ],
    },
  },
];
