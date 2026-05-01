# 2D Minecraft - Current Improvement Plan

## Current State

The project is a React 19, TypeScript, Vite, and Canvas 2D sandbox game. It already includes several optimizations that older notes described as future work:

- Lazy streamed world columns with background prefetching
- Deterministic world generation and compact world-delta persistence
- Circular-buffer rewind history with a reduced snapshot window
- Spatial hash support for animal proximity logic
- Focused Vitest coverage for crafting, runtime initialization, collision, world generation, and world storage

## Priority Legend

| Priority | Meaning |
| --- | --- |
| P0 | Critical: correctness, crashes, or unplayable behavior |
| P1 | High: significant usability, performance, or maintainability gain |
| P2 | Medium: polish or broader coverage |
| P3 | Low: cleanup or future-facing work |

## P0 - Gameplay Correctness

### 1. Keep Debug Controls Explicit

Debug behavior must remain opt-in and must not conflict with normal gameplay controls. Movement keys, especially `A` and `D`, should never trigger damage, death, respawn, or mode changes during normal play.

Current rule:

- Debug controls are enabled by `?debugControls` or `localStorage.blockbuilder_debug_controls = '1'`
- Destructive debug actions require `Alt+Shift`

### 2. Add Browser-Level Smoke Coverage

The current tests cover pure logic well, but they do not launch the browser. Add a small Playwright smoke suite that verifies:

- The canvas renders a nonblank frame
- `D` moves or attempts to move right without killing the player
- Inventory opens and closes with `E` or `I`
- A save can be created and a new game can clear it

## P1 - UX and Gameplay Clarity

### 1. In-Game Control Reference

The README now documents controls, but players should also be able to discover the controls in game. Keep the overlay concise and avoid listing debug shortcuts unless debug controls are enabled.

### 2. Save/Load Feedback

Auto-save is silent. Add a small nonblocking save indicator or timestamp so players know persistence is working.

### 3. New Game Confirmation

Starting a new game deletes the current save. Add a confirmation flow to prevent accidental save loss.

## P1 - Performance

### 1. Render Texture Cache

Terrain rendering still draws many block details directly. Pre-render each block type to an offscreen canvas or `ImageBitmap`, then draw cached textures during the frame.

Expected impact: fewer fill operations per visible block and more stable frame time.

### 2. Measure World Streaming Cost

The streamed world store avoids full startup generation, but it should be profiled in browser dev tools during fast horizontal travel. Track:

- Column generation time
- Worker response latency
- Eviction frequency
- Main-thread frame spikes

### 3. Entity Update Profiling

Spatial hashing exists, but animal behavior should still be profiled with high entity counts. Focus on predator/prey scans, dropped item physics, and water animal movement.

## P2 - Test Coverage

Add focused tests for:

- Furnace input, fuel, output, and broken-furnace item drops
- Save/load migration and malformed save handling
- Debug shortcut gating
- Player death, auto-respawn, and manual respawn
- Cocoa Cat combat and armor requirements

## P2 - Maintainability

### 1. Move Debug Input Out of the Main Hook

`useGameLoop` still owns input binding, debug shortcuts, autosave, update scheduling, and UI synchronization. Consider extracting input handling into a dedicated module once the behavior is covered by tests.

### 2. Document Save Schema

`persistence.ts` uses a versioned save shape. Keep a short schema note with migration expectations before adding `v3`.

### 3. Reconcile Runtime History Field

`GameState.history` is currently retained for potential future use while rewind uses a module-level circular buffer. Remove it or wire it to tooling once there is a clear consumer.

## Verification Checklist

Run this before merging gameplay changes:

```bash
npm test
npm run lint
npm run build
```
