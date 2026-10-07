import { libraryConfig } from '@guidedreel/config/tsup';

export default libraryConfig({
  entry: ['src/index.ts', 'src/metadata.ts', 'src/entry.tsx'],
});
