import { libraryConfig } from '@guidedreel/config/tsup';

export default libraryConfig({
  entry: ['src/index.ts'],
  // Ship the design tokens next to the compiled components. `@source "./"` makes the consumer's
  // Tailwind scan this dist folder for utility classes, so apps need no @source of their own.
  async onSuccess() {
    const { readFile, writeFile } = await import('node:fs/promises');
    const css = await readFile('src/styles.css', 'utf8');
    await writeFile('dist/styles.css', `@source "./";\n\n${css}`);
  },
});
