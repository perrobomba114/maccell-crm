/** Keep OCR memory bounded even when an operator supplies an excessive value. */
export function workerConcurrency(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 4) : 2;
}

/** A failed file does not discard later work; cancellation stops only new work. */
export async function runBounded<T, R>(items: readonly T[], concurrency: number, work: (item: T) => Promise<R>, signal?: AbortSignal): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (cursor < items.length && !signal?.aborted) {
      const index = cursor++;
      try { results[index] = { status: 'fulfilled', value: await work(items[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  });
  await Promise.allSettled(workers);
  return results;
}

interface IndexConnection {
  on(event: 'error', listener: (error: Error) => void): unknown;
  removeListener(event: 'error', listener: (error: Error) => void): unknown;
  release(destroy?: boolean): void;
}

/** Keep checked-out pg errors handled during external work; a broken session cancels only this cycle. */
export async function withIndexConnection<T>(client: IndexConnection, parent: AbortSignal, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const cycle = new AbortController();
  let connectionFailed = false;
  const cancel = () => cycle.abort(parent.reason);
  const lostConnection = () => { connectionFailed = true; cycle.abort(new Error('INDEX_CONNECTION_LOST')); };
  client.on('error', lostConnection);
  parent.addEventListener('abort', cancel, { once: true });
  if (parent.aborted) cancel();
  try {
    cycle.signal.throwIfAborted();
    const result = await work(cycle.signal);
    cycle.signal.throwIfAborted();
    return result;
  } finally {
    // Return/destroy the client while its error listener is still installed.
    try { client.release(connectionFailed); }
    finally {
      client.removeListener('error', lostConnection);
      parent.removeEventListener('abort', cancel);
    }
  }
}

/** Selective QA is explicit; priority only changes order and never removes corpus work. */
export function selectIndexAssets<T extends { id: string }>(assets: readonly T[], argumentsList: readonly string[]): T[] {
  const values = (flag: string) => argumentsList.flatMap(argument => {
    if (argument === flag) throw new Error(`Usá ${flag}=id (o una lista separada por comas)`);
    if (!argument.startsWith(`${flag}=`)) return [];
    const ids = argument.slice(flag.length + 1).split(',').map(id => id.trim()).filter(Boolean);
    if (!ids.length) throw new Error(`La selección ${flag} está vacía`);
    return ids;
  });
  const selected = new Set(values('--asset'));
  for (const id of selected) if (!assets.some(asset => asset.id === id)) throw new Error(`No se encontró el archivo solicitado: ${id}`);
  const priorities = [...new Set(values('--priority'))];
  const priorityOrder = new Map(priorities.map((id, index) => [id, index]));
  return assets.filter(asset => !selected.size || selected.has(asset.id)).sort((left, right) =>
    (priorityOrder.get(left.id) ?? priorities.length) - (priorityOrder.get(right.id) ?? priorities.length));
}
