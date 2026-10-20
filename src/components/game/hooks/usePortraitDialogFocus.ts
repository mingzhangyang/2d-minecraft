import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

/** Decide whether Tab must wrap rather than escaping the modal dialog. */
export function getWrappedTabTarget<T>(
  focusable: readonly T[],
  active: T | null,
  backwards: boolean,
): T | null {
  if (focusable.length === 0) return null;
  if (backwards) {
    return active === focusable[0] || !focusable.includes(active as T)
      ? focusable[focusable.length - 1]
      : null;
  }
  return active === focusable[focusable.length - 1] || !focusable.includes(active as T)
    ? focusable[0]
    : null;
}

/**
 * The gate stays mounted only in portrait. Background controls are inert in the
 * parent; this hook manages dialog focus and restores focus after rotation.
 */
export function usePortraitDialogFocus(
  open: boolean,
  dialogRef: RefObject<HTMLDivElement | null>,
  gameplayFocusRef: RefObject<HTMLCanvasElement | null>,
) {
  const lastGameplayFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) return;

    const rememberFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && !dialogRef.current?.contains(event.target)) {
        lastGameplayFocus.current = event.target;
      }
    };
    document.addEventListener('focusin', rememberFocus);
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      lastGameplayFocus.current = active;
    }
    return () => document.removeEventListener('focusin', rememberFocus);
  }, [open, dialogRef]);

  useLayoutEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        const previous = lastGameplayFocus.current;
        const target = previous?.isConnected ? previous : gameplayFocusRef.current;
        target?.focus();
      }
      return;
    }

    wasOpen.current = true;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.focus();

    // Programmatic focus changes should not enter the inert gameplay layer.
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        dialog.focus();
      }
    };
    document.addEventListener('focusin', keepFocusInside);
    return () => document.removeEventListener('focusin', keepFocusInside);
  }, [open, dialogRef, gameplayFocusRef]);

  const onDialogKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const candidates: HTMLElement[] = [];
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable.forEach(element => {
      if (element.getClientRects().length > 0 && !element.hasAttribute('inert')) {
        candidates.push(element);
      }
    });
    const wrappedTarget = getWrappedTabTarget(candidates, document.activeElement as HTMLElement | null, event.shiftKey);

    if (candidates.length === 0 || wrappedTarget) {
      event.preventDefault();
      (wrappedTarget ?? dialog).focus();
    }
  }, [dialogRef]);

  return { onDialogKeyDown };
}
