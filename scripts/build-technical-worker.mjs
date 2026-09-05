import { build } from 'esbuild';
await build({
  entryPoints: {
    'technical-worker': 'scripts/index-technical-library.ts',
    'schematics-vector-worker': 'scripts/schematics-vector-worker.ts',
  },
  outdir: 'scripts', outExtension: { '.js': '.cjs' }, bundle: true,
  platform: 'node', target: 'node20', format: 'cjs', external: ['pg', 'pg-native'], logLevel: 'warning',
});
