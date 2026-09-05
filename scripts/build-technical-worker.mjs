import { build } from 'esbuild';
await build({entryPoints:['scripts/index-technical-library.ts'],outfile:'scripts/technical-worker.cjs',bundle:true,platform:'node',target:'node20',format:'cjs',external:['pg','pg-native'],logLevel:'warning'});
