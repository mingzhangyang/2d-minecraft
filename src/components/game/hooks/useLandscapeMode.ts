import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

type FullscreenHost = { requestFullscreen?: () => Promise<void> };
type FullscreenState = { fullscreenElement: Element | null };
type OrientationControl = { lock?: (orientation: 'landscape') => Promise<void> };

export type LandscapeLockResult = 'locked' | 'unavailable' | 'rejected';

/** The project's DOM types omit this optional browser API. */
function getOrientationControl(): OrientationControl | undefined {
  if (typeof screen === 'undefined') return undefined;
  return screen.orientation as (ScreenOrientation & OrientationControl) | undefined;
}

/**
 * Browsers generally require fullscreen before locking orientation, and
 * fullscreen itself requires a user gesture. Keep the sequence in one place
 * so unsupported browsers can fall back to a physical-rotation prompt.
 */
export async function lockLandscapeInFullscreen(
  host: FullscreenHost,
  doc: FullscreenState,
  orientation: OrientationControl | undefined,
): Promise<LandscapeLockResult> {
  if (typeof orientation?.lock !== 'function') return 'unavailable';

  try {
    if (!doc.fullscreenElement) {
      if (typeof host.requestFullscreen !== 'function') return 'unavailable';
      await host.requestFullscreen();
    }
    await orientation.lock('landscape');
    return 'locked';
  } catch {
    return 'rejected';
  }
}

function isTouchPortrait() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(orientation: portrait)').matches
  );
}

/** Request landscape where supported; prompt to rotate on restricted browsers. */
export function useLandscapeMode(rootRef: RefObject<HTMLDivElement | null>) {
  const [needsLandscape, setNeedsLandscape] = useState(isTouchPortrait);
  const [requestFailed, setRequestFailed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const pendingRef = useRef(false);

  const canRequestLandscape = typeof getOrientationControl()?.lock === 'function';

  useEffect(() => {
    const touchQuery = window.matchMedia('(pointer: coarse)');
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    const update = () => {
      const needsRotation = touchQuery.matches && portraitQuery.matches;
      setNeedsLandscape(needsRotation);
      if (!needsRotation) setRequestFailed(false);
    };

    touchQuery.addEventListener('change', update);
    portraitQuery.addEventListener('change', update);
    window.addEventListener('resize', update);
    update();

    // Installed/standalone web apps may allow this without an extra gesture.
    // Ordinary mobile tabs reject it; the button below retries in fullscreen.
    const orientation = getOrientationControl();
    if (touchQuery.matches && typeof orientation?.lock === 'function') {
      try {
        void orientation.lock('landscape').catch(() => {});
      } catch {
        // A browser may throw synchronously rather than return a promise.
      }
    }

    return () => {
      touchQuery.removeEventListener('change', update);
      portraitQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const requestLandscape = useCallback(async () => {
    if (pendingRef.current || !rootRef.current) return;
    pendingRef.current = true;
    setIsRequesting(true);
    try {
      const result = await lockLandscapeInFullscreen(rootRef.current, document, getOrientationControl());
      setRequestFailed(result !== 'locked');
    } finally {
      pendingRef.current = false;
      setIsRequesting(false);
    }
  }, [rootRef]);

  return { needsLandscape, canRequestLandscape, requestLandscape, isRequesting, requestFailed };
}
