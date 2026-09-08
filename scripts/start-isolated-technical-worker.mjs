import { readFile } from 'node:fs/promises';

// The mounted credential is read as data, never evaluated by a shell.
if (!process.env.DATABASE_URL) {
  const file = process.env.SCHEMATICS_WORKER_ENV_FILE ?? '/app/upload/.technical-indexer.env';
  const content = await readFile(file, 'utf8');
  const line = content.split('\n').find(value => value.startsWith('DATABASE_URL='));
  if (!line?.slice('DATABASE_URL='.length)) throw new Error('Falta la conexión del worker técnico');
  process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).replace(/\r$/, '');
}
await import('./technical-worker.cjs');
