import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { BlockType } from '../types';
import { generateBaseColumnSync } from './generation';

type WorldMeta = {
  target: BlockType[][];
  generatedColumns: Set<number>;
  dirtyColumns: Set<number>;
  columns: Map<number, ColumnState>;
  prefetchQueue: number[];
  queuedPrefetch: Set<number>;
  prefetchHandle: number | null;
  prefetchWindow: { minX: number; maxX: number } | null;
  prefetchWorker: Worker | null;
  prefetchWorkerBusy: boolean;
};

type ColumnState = {
  base: BlockType[] | null;
  edits: Map<number, BlockType> | null;
  proxy: BlockType[] | null;
};

type IdleSlice = {
  didTimeout?: boolean;
  timeRemaining?: () => number;
};

type IdleCapableWindow = Window & typeof globalThis & {
  requestIdleCallback?: (
    callback: (deadline: IdleSlice) => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type PrefetchWorkerMessage = {
  columns: Array<[number, BlockType[]]>;
};

const WORLD_META = new WeakMap<BlockType[][], WorldMeta>();
const WORLD_INDEX_RE = /^\d+$/;
const PREFETCH_CHUNK_WIDTH = 64;
const PREFETCH_BAND_WIDTH = PREFETCH_CHUNK_WIDTH * 2;
const PREFETCH_BATCH_SIZE = 8;

const isWorldIndex = (prop: PropertyKey): prop is string =>
  typeof prop === 'string' && WORLD_INDEX_RE.test(prop);

const ensureColumnState = (meta: WorldMeta, x: number): ColumnState => {
  let state = meta.columns.get(x);
  if (!state) {
    state = {
      base: null,
      edits: null,
      proxy: null,
    };
    meta.columns.set(x, state);
  }
  return state;
};

const ensureBaseColumn = (meta: WorldMeta, x: number) => {
  const state = ensureColumnState(meta, x);
  if (!state.base) {
    state.base = generateBaseColumnSync(x);
    meta.generatedColumns.add(x);
  }
  return state.base;
};

const getColumnValue = (meta: WorldMeta, x: number, y: number): BlockType => {
  const state = ensureColumnState(meta, x);
  const edited = state.edits?.get(y);
  if (edited !== undefined) {
    return edited;
  }
  return ensureBaseColumn(meta, x)[y];
};

const setColumnValue = (meta: WorldMeta, x: number, y: number, value: BlockType) => {
  const state = ensureColumnState(meta, x);
  const baseValue = ensureBaseColumn(meta, x)[y];

  if (value === baseValue) {
    state.edits?.delete(y);
    if (state.edits && state.edits.size === 0) {
      state.edits = null;
      meta.dirtyColumns.delete(x);
    }
  } else {
    if (!state.edits) {
      state.edits = new Map<number, BlockType>();
    }
    state.edits.set(y, value);
    meta.dirtyColumns.add(x);
  }

  meta.generatedColumns.add(x);
};

const createColumnProxy = (meta: WorldMeta, x: number) => {
  const state = ensureColumnState(meta, x);
  if (state.proxy) {
    return state.proxy;
  }

  const target = new Array(WORLD_HEIGHT) as BlockType[];
  target.length = WORLD_HEIGHT;
  state.proxy = new Proxy(target, {
    get(arr, prop, receiver) {
      if (isWorldIndex(prop)) {
        const y = Number(prop);
        if (y < 0 || y >= WORLD_HEIGHT) return undefined;
        return getColumnValue(meta, x, y);
      }
      return Reflect.get(arr, prop, receiver);
    },
    set(arr, prop, value, receiver) {
      if (isWorldIndex(prop)) {
        const y = Number(prop);
        if (y < 0 || y >= WORLD_HEIGHT) return false;
        setColumnValue(meta, x, y, value as BlockType);
        return true;
      }
      return Reflect.set(arr, prop, value, receiver);
    },
  }) as BlockType[];
  return state.proxy;
};

export const getGeneratedWorldColumns = (world: BlockType[][]): number[] => {
  const meta = WORLD_META.get(world);
  if (meta) {
    return Array.from(meta.generatedColumns).sort((a, b) => a - b);
  }

  return Object.keys(world)
    .filter(key => WORLD_INDEX_RE.test(key))
    .map(Number)
    .sort((a, b) => a - b);
};

export const getDirtyWorldEdits = (world: BlockType[][]): Array<[number, number, number]> => {
  const meta = WORLD_META.get(world);
  if (!meta) return [];

  const deltas: Array<[number, number, number]> = [];
  const dirtyColumns = Array.from(meta.dirtyColumns).sort((a, b) => a - b);
  for (const x of dirtyColumns) {
    const state = meta.columns.get(x);
    if (!state?.edits) continue;

    const ys = Array.from(state.edits.keys()).sort((a, b) => a - b);
    for (const y of ys) {
      const block = state.edits.get(y);
      if (block !== undefined) {
        deltas.push([x, y, block]);
      }
    }
  }
  return deltas;
};

const queuePrefetchColumn = (meta: WorldMeta, x: number) => {
  if (x < 0 || x >= WORLD_WIDTH) return;
  if (meta.queuedPrefetch.has(x)) return;

  const state = meta.columns.get(x);
  if (state?.base) return;

  meta.prefetchQueue.push(x);
  meta.queuedPrefetch.add(x);
};

const queueBandColumns = (meta: WorldMeta, startX: number, endX: number, ascending: boolean) => {
  if (startX > endX) return;

  if (ascending) {
    for (let chunkStart = startX; chunkStart <= endX; chunkStart += PREFETCH_CHUNK_WIDTH) {
      const chunkEnd = Math.min(endX, chunkStart + PREFETCH_CHUNK_WIDTH - 1);
      for (let x = chunkStart; x <= chunkEnd; x++) {
        queuePrefetchColumn(meta, x);
      }
    }
    return;
  }

  for (let chunkEnd = endX; chunkEnd >= startX; chunkEnd -= PREFETCH_CHUNK_WIDTH) {
    const chunkStart = Math.max(startX, chunkEnd - PREFETCH_CHUNK_WIDTH + 1);
    for (let x = chunkEnd; x >= chunkStart; x--) {
      queuePrefetchColumn(meta, x);
    }
  }
};

const trimPrefetchQueue = (meta: WorldMeta, minX: number, maxX: number) => {
  meta.prefetchWindow = { minX, maxX };
  if (meta.prefetchQueue.length === 0) return;

  const nextQueue: number[] = [];
  const nextQueued = new Set<number>();
  for (const x of meta.prefetchQueue) {
    if (x >= minX && x <= maxX) {
      nextQueue.push(x);
      nextQueued.add(x);
    }
  }
  meta.prefetchQueue = nextQueue;
  meta.queuedPrefetch = nextQueued;
};

const hasIdleBudget = (deadline: IdleSlice | undefined, processed: number) => {
  if (!deadline) return processed < PREFETCH_BATCH_SIZE;
  if (deadline.didTimeout) return processed < PREFETCH_BATCH_SIZE;
  if (processed === 0) return true;
  return (deadline.timeRemaining?.() ?? 0) > 2 && processed < PREFETCH_BATCH_SIZE;
};

const flushPrefetchQueue = (meta: WorldMeta, deadline?: IdleSlice) => {
  let processed = 0;

  while (meta.prefetchQueue.length > 0 && hasIdleBudget(deadline, processed)) {
    const x = meta.prefetchQueue.shift();
    if (x === undefined) break;
    meta.queuedPrefetch.delete(x);

    const windowBounds = meta.prefetchWindow;
    if (windowBounds && (x < windowBounds.minX || x > windowBounds.maxX)) {
      continue;
    }

    ensureBaseColumn(meta, x);
    processed++;
  }
};

const scheduleMainThreadPrefetch = (meta: WorldMeta) => {
  if (meta.prefetchHandle !== null || meta.prefetchQueue.length === 0 || typeof window === 'undefined') {
    return;
  }

  const idleWindow = window as IdleCapableWindow;
  const run = (deadline?: IdleSlice) => {
    meta.prefetchHandle = null;
    flushPrefetchQueue(meta, deadline);
    if (meta.prefetchQueue.length > 0) {
      schedulePrefetchFlush(meta);
    }
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    meta.prefetchHandle = idleWindow.requestIdleCallback(run, { timeout: 100 });
    return;
  }

  meta.prefetchHandle = window.setTimeout(() => run(), 16);
};

const cancelMainThreadPrefetch = (meta: WorldMeta) => {
  if (meta.prefetchHandle === null || typeof window === 'undefined') {
    return;
  }

  const idleWindow = window as IdleCapableWindow;
  if (typeof idleWindow.cancelIdleCallback === 'function') {
    idleWindow.cancelIdleCallback(meta.prefetchHandle);
  } else {
    window.clearTimeout(meta.prefetchHandle);
  }
  meta.prefetchHandle = null;
};

const applyPrefetchedColumn = (meta: WorldMeta, x: number, column: BlockType[]) => {
  const windowBounds = meta.prefetchWindow;
  if (windowBounds && (x < windowBounds.minX || x > windowBounds.maxX)) {
    return;
  }

  const state = ensureColumnState(meta, x);
  if (!state.base) {
    state.base = column;
    meta.generatedColumns.add(x);
  }
};

const dispatchPrefetchBatchToWorker = (meta: WorldMeta, worker: Worker) => {
  if (meta.prefetchWorkerBusy) return true;

  const batch: number[] = [];
  while (meta.prefetchQueue.length > 0 && batch.length < PREFETCH_BATCH_SIZE) {
    const x = meta.prefetchQueue.shift();
    if (x === undefined) break;
    meta.queuedPrefetch.delete(x);

    const windowBounds = meta.prefetchWindow;
    if (windowBounds && (x < windowBounds.minX || x > windowBounds.maxX)) {
      continue;
    }
    if (meta.columns.get(x)?.base) {
      continue;
    }
    batch.push(x);
  }

  if (batch.length === 0) {
    return true;
  }

  meta.prefetchWorkerBusy = true;
  worker.postMessage({ columns: batch });
  return true;
};

const getOrCreatePrefetchWorker = (meta: WorldMeta) => {
  if (meta.prefetchWorker || typeof window === 'undefined' || typeof Worker === 'undefined') {
    return meta.prefetchWorker;
  }

  let worker: Worker;
  try {
    worker = new Worker(new URL('../worldPrefetchWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  worker.onmessage = (event: MessageEvent<PrefetchWorkerMessage>) => {
    meta.prefetchWorkerBusy = false;
    const columns = event.data?.columns;
    if (Array.isArray(columns)) {
      for (const [x, column] of columns) {
        applyPrefetchedColumn(meta, x, column);
      }
    }

    if (meta.prefetchQueue.length > 0) {
      schedulePrefetchFlush(meta);
    }
  };
  worker.onerror = () => {
    meta.prefetchWorkerBusy = false;
    worker.terminate();
    meta.prefetchWorker = null;
    scheduleMainThreadPrefetch(meta);
  };

  meta.prefetchWorker = worker;
  return worker;
};

const schedulePrefetchFlush = (meta: WorldMeta) => {
  if (meta.prefetchQueue.length === 0) {
    return;
  }

  const worker = getOrCreatePrefetchWorker(meta);
  if (worker && dispatchPrefetchBatchToWorker(meta, worker)) {
    return;
  }

  scheduleMainThreadPrefetch(meta);
};

export const disposeWorldStreaming = (world: BlockType[][]): void => {
  const meta = WORLD_META.get(world);
  if (!meta) return;

  cancelMainThreadPrefetch(meta);
  if (meta.prefetchWorker) {
    meta.prefetchWorker.terminate();
    meta.prefetchWorker = null;
  }
  meta.prefetchWorkerBusy = false;
  meta.prefetchQueue = [];
  meta.queuedPrefetch.clear();
  meta.prefetchWindow = null;
};

export const queueWorldPrefetch = (
  world: BlockType[][],
  visibleStartX: number,
  visibleEndX: number,
  directionHint = 0,
): void => {
  const meta = WORLD_META.get(world);
  if (!meta) return;

  const viewportStart = Math.max(0, Math.floor(visibleStartX));
  const viewportEnd = Math.min(WORLD_WIDTH - 1, Math.floor(visibleEndX));
  if (viewportStart > viewportEnd) return;

  const leftStart = Math.max(0, viewportStart - PREFETCH_BAND_WIDTH);
  const leftEnd = viewportStart - 1;
  const rightStart = viewportEnd + 1;
  const rightEnd = Math.min(WORLD_WIDTH - 1, viewportEnd + PREFETCH_BAND_WIDTH);

  trimPrefetchQueue(meta, leftStart, rightEnd);

  if (directionHint > 0.1) {
    queueBandColumns(meta, rightStart, rightEnd, true);
    queueBandColumns(meta, leftStart, leftEnd, false);
  } else if (directionHint < -0.1) {
    queueBandColumns(meta, leftStart, leftEnd, false);
    queueBandColumns(meta, rightStart, rightEnd, true);
  } else {
    queueBandColumns(meta, leftStart, leftEnd, false);
    queueBandColumns(meta, rightStart, rightEnd, true);
  }

  schedulePrefetchFlush(meta);
};

export const evictWorldColumns = (world: BlockType[][], keepStartX: number, keepEndX: number): void => {
  const meta = WORLD_META.get(world);
  if (!meta) return;

  const minX = Math.max(0, Math.floor(keepStartX));
  const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil(keepEndX));

  for (const x of Array.from(meta.columns.keys())) {
    if (x >= minX && x <= maxX) continue;

    const state = meta.columns.get(x);
    if (!state) continue;

    state.base = null;
    state.proxy = null;
    delete meta.target[x];
    meta.generatedColumns.delete(x);

    if (!state.edits || state.edits.size === 0) {
      meta.columns.delete(x);
      meta.dirtyColumns.delete(x);
    }
  }
};

export const generateWorld = (): BlockType[][] => {
  const target = new Array(WORLD_WIDTH) as BlockType[][];
  target.length = WORLD_WIDTH;
  const meta: WorldMeta = {
    target,
    generatedColumns: new Set<number>(),
    dirtyColumns: new Set<number>(),
    columns: new Map<number, ColumnState>(),
    prefetchQueue: [],
    queuedPrefetch: new Set<number>(),
    prefetchHandle: null,
    prefetchWindow: null,
    prefetchWorker: null,
    prefetchWorkerBusy: false,
  };

  const world = new Proxy(target, {
    get(arr, prop, receiver) {
      if (isWorldIndex(prop)) {
        const index = Number(prop);
        if (index < 0 || index >= WORLD_WIDTH) return undefined;
        meta.generatedColumns.add(index);
        let column = arr[index];
        if (!column) {
          column = createColumnProxy(meta, index);
          arr[index] = column;
        }
        return column;
      }
      return Reflect.get(arr, prop, receiver);
    },
    set(arr, prop, value, receiver) {
      if (isWorldIndex(prop)) {
        const index = Number(prop);
        if (index >= 0 && index < WORLD_WIDTH) {
          meta.generatedColumns.add(index);
          const state = ensureColumnState(meta, index);
          state.base = Array.isArray(value) ? [...(value as BlockType[])] : null;
          state.edits = null;
          state.proxy = createColumnProxy(meta, index);
          meta.dirtyColumns.delete(index);
          return Reflect.set(arr, prop, state.proxy, receiver);
        }
      }
      return Reflect.set(arr, prop, value, receiver);
    },
  }) as BlockType[][];

  WORLD_META.set(world, meta);
  return world;
};
