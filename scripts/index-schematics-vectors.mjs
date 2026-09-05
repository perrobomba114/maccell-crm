import { runSemanticWorker } from './schematics-vector-worker.cjs';
runSemanticWorker().catch(error => {
  process.stderr.write((error instanceof Error ? error.message : 'No se pudo iniciar el índice semántico') + '\n');
  process.exitCode = 1;
});
