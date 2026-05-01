export const DEBUG_CONTROLS_STORAGE_KEY = 'blockbuilder_debug_controls';
export const DEBUG_FORCE_DEATH_KEY = 'k';

type KeyboardShortcutEvent = {
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

export const isDebugShortcutModifier = (event: KeyboardShortcutEvent): boolean =>
  event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;

export const areDebugControlsEnabled = (
  search?: string,
  storageValue?: string | null,
): boolean => {
  const currentSearch =
    search ??
    (typeof window !== 'undefined' ? window.location.search : '');
  let currentStorageValue = storageValue ?? null;
  if (storageValue === undefined && typeof window !== 'undefined') {
    try {
      currentStorageValue = window.localStorage.getItem(DEBUG_CONTROLS_STORAGE_KEY);
    } catch {
      currentStorageValue = null;
    }
  }

  return (
    currentStorageValue === '1' ||
    new URLSearchParams(currentSearch).has('debugControls')
  );
};
