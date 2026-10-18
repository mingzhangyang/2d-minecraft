// Analytics V2: transport, open/active time, retries and idempotency belong to the
// canonical games client. This adapter only supplies the standalone game identity
// and its read-only playing lifecycle. Never send legacy beacons in parallel.
const GAME_ID = 'minecraft';
const PRODUCTION_ORIGIN = 'https://2d-minecraft.orangely.xyz';
const CLIENT_URL = 'https://games.orangely.xyz/analytics.js';

export type TrackEvent = 'play' | 'finish';
type AnalyticsWindow = Window & {
  hubTrack?: (game: string, kind: TrackEvent) => void;
  hubAnalytics?: { bindPlaying?: (game: string, predicate: () => boolean) => void };
  __gamesAnalyticsPlaying?: Map<string, () => boolean>;
};

let status: 'idle' | 'loading' | 'ready' | 'disabled' = 'idle';
let currentPlaying: () => boolean = () => false;
const pending: TrackEvent[] = [];

function isProduction(): boolean {
  return typeof window !== 'undefined' && window.location.origin === PRODUCTION_ORIGIN;
}

function playing(): boolean {
  try {
    return Boolean(currentPlaying());
  } catch {
    return false;
  }
}

function deliver(kind: TrackEvent): void {
  try {
    (window as AnalyticsWindow).hubTrack?.(GAME_ID, kind);
  } catch {
    // Analytics must never block gameplay.
  }
}

/** Call once when the game mounts. Repeated calls only update the state reader. */
export function initAnalytics(isPlaying: () => boolean): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  currentPlaying = isPlaying;
  const browser = window as AnalyticsWindow;
  const registry = browser.__gamesAnalyticsPlaying instanceof Map
    ? browser.__gamesAnalyticsPlaying : new Map<string, () => boolean>();
  registry.set(GAME_ID, playing);
  browser.__gamesAnalyticsPlaying = registry;
  try {
    browser.hubAnalytics?.bindPlaying?.(GAME_ID, playing);
  } catch {
    // The Map registration also works before the shared client loads.
  }
  if (status !== 'idle') return;
  if (!isProduction()) {
    status = 'disabled'; // localhost and Cloudflare preview never write production stats
    return;
  }

  status = 'loading';
  try {
    const script = document.createElement('script');
    script.src = CLIENT_URL;
    script.async = true;
    script.dataset.analyticsGame = GAME_ID;
    script.dataset.analyticsExternal = 'true';
    script.addEventListener('load', () => {
      status = 'ready';
      try {
        browser.hubAnalytics?.bindPlaying?.(GAME_ID, playing);
      } catch {
        // Lifecycle is also available through __gamesAnalyticsPlaying.
      }
      for (const kind of pending.splice(0)) deliver(kind);
    }, { once: true });
    script.addEventListener('error', () => {
      status = 'disabled';
      pending.length = 0;
    }, { once: true });
    document.head.append(script);
  } catch {
    status = 'disabled';
    pending.length = 0;
  }
}

/** Existing game-owned play/finish boundaries; no new timers or network calls. */
export function track(kind: TrackEvent): void {
  if (!isProduction()) return;
  if (status === 'ready') deliver(kind);
  else if (status === 'loading' && pending.length < 16) pending.push(kind);
}
