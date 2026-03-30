import { generateBaseColumnSync } from './world/generation';
import { BlockType } from './types';

type PrefetchRequest = {
  columns: number[];
};

type PrefetchResponse = {
  columns: Array<[number, BlockType[]]>;
};

const workerScope = self as typeof globalThis & {
  onmessage: ((event: MessageEvent<PrefetchRequest>) => void) | null;
  postMessage: (message: PrefetchResponse) => void;
};

workerScope.onmessage = (event: MessageEvent<PrefetchRequest>) => {
  const requestedColumns = Array.isArray(event.data?.columns) ? event.data.columns : [];
  const columns: Array<[number, BlockType[]]> = requestedColumns.map(x => [
    x,
    generateBaseColumnSync(x),
  ]);
  workerScope.postMessage({ columns });
};

export {};
