import { libraryConfig } from '@guidedreel/config/tsup';

export default libraryConfig({
  entry: ['src/index.ts', 'src/ui.ts', 'src/render.ts', 'src/storage.ts', 'src/providers.ts'],
  async onSuccess() {
    const { copyFile } = await import('node:fs/promises');
    await copyFile('src/styles.css', 'dist/styles.css');
  },
});
