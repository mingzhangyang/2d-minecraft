import { describe, expect, it } from 'vitest';
import { getWrappedTabTarget } from './usePortraitDialogFocus';

describe('portrait dialog keyboard focus', () => {
  const first = 'fullscreen button';
  const last = 'secondary action';
  const focusable = [first, last];

  it('wraps forwards and backwards at the ends of the dialog', () => {
    expect(getWrappedTabTarget(focusable, last, false)).toBe(first);
    expect(getWrappedTabTarget(focusable, first, true)).toBe(last);
  });

  it('lets Tab move normally between controls inside the dialog', () => {
    expect(getWrappedTabTarget(focusable, first, false)).toBeNull();
    expect(getWrappedTabTarget(focusable, last, true)).toBeNull();
  });

  it('directs Tab into the modal when the container itself has focus', () => {
    expect(getWrappedTabTarget(focusable, null, false)).toBe(first);
    expect(getWrappedTabTarget(focusable, null, true)).toBe(last);
    expect(getWrappedTabTarget([first], first, false)).toBe(first);
  });

  it('handles unsupported browsers with no focusable action', () => {
    expect(getWrappedTabTarget([], null, false)).toBeNull();
  });
});
