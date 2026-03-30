# 2D Block Builder - Improvement & Optimization Plan

## Project Summary

A feature-rich 2D Minecraft-like sandbox built with React 19, TypeScript, Canvas 2D, and Vite. It features 66 block types, 16 animal types, 10 biomes, crafting, smelting, a boss fight, day/night cycle, weather, and a 100,000-block-wide world. The game runs at 60 FPS via `requestAnimationFrame` with a React overlay for UI.

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| P0 | Critical - causes crashes, memory exhaustion, or unplayable framerate |
| P1 | High - significant performance or correctness improvement |
| P2 | Medium - noticeable quality-of-life or maintainability gain |
| P3 | Low - polish, cleanup, or future-proofing |

---

## 1. PERFORMANCE - Critical Bottlenecks

### 1.1 Chunked World Generation (P0)

**Problem:** The entire 100,000 x 64 world (6.4M tiles) is generated synchronously on startup. This blocks the main thread for multiple seconds and allocates ~25MB+ for the world array alone.

**Files:** `world.ts` (generateWorld), `runtime.ts` (createInitialGameState)

**Plan:**
- Divide the world into chunks of 64x64 tiles (1,563 chunks total)
- Generate only the chunks within the player's viewport + a 2-chunk buffer zone
- Lazy-generate new chunks as the player moves
- Use a `Map<string, BlockType[][]>` keyed by chunk coordinates
- Optionally use a Web Worker for background chunk generation to avoid frame drops during exploration

**Impact:** Startup time drops from seconds to near-instant. Memory usage drops from ~25MB to ~1MB at any given time.

---

### 1.2 History/Rewind System Memory Explosion (P0)

**Problem:** Every frame, the entire game state (player, all animals, all dropped items) is deep-cloned and pushed into a 600-entry history array. With 80 animals and 200+ dropped items, each snapshot is ~0.5-1MB. At 600 frames that's **300-600MB of memory** just for rewind, and `Array.shift()` on a 600-element array is O(n) every frame.

**File:** `updateWorldSystem.ts` lines 9-38

**Plan:**
- Replace `Array` + `.shift()` with a **circular buffer** (fixed-size array + head/tail index) to eliminate O(n) shifts
- Snapshot only **deltas** (changed properties) instead of full clones
- Reduce snapshot frequency to every 3-5 frames (still gives smooth-enough rewind)
- Cap animal/item clone depth: only store position + health, not full object copies
- Consider making rewind opt-in (disabled by default, enabled with a toggle)

**Impact:** Memory usage for history drops from ~500MB to ~5-10MB. Per-frame allocation drops by 95%.

---

### 1.3 O(n^2) Animal Interaction System (P0)

**Problem:** Every frame, each animal checks every other animal for flee/target/predator logic. With 80 animals, that's 6,400+ comparisons per frame. Some paths (herbivore food-seeking) have triple nested loops scanning 121 tiles per animal.

**File:** `updateAnimalSystem.ts` lines 262-942

**Specific hotspots:**
- Lines 378-405: Every herbivore scans all animals for snake presence
- Lines 437-461: Orca scans all animals for prey
- Lines 465-495: Herbivores scan 11x11 tile grid for food
- Lines 543-576: Leopards/Jaguars scan all animals for targets

**Plan:**
- Implement a **spatial hash grid** (cell size = 256px or 8 tiles):
  - Insert all animals into grid cells based on position
  - Query only the nearby cells (3x3 neighborhood) for interactions
  - Reduces comparisons from O(n^2) to O(n * k) where k is local density
- Cache predator/prey lists per frame (compute once, reuse across all animals)
- For food-seeking: pre-compute a "food block index" that tracks food-block positions, updated only when blocks change (event-driven instead of brute-force scanning)

**Impact:** Animal update time drops from O(n^2) to near-O(n). Frame time for 80+ animals drops significantly.

---

### 1.4 Dropped Items Physics (P1)

**Problem:** Every dropped item recalculates `Math.sqrt()` for distance to player every frame. With 200+ items, that's 200+ sqrt calls per frame. Worm sun-exposure check scans the full vertical column per worm per frame.

**File:** `updateAnimalSystem.ts` lines 14-119

**Plan:**
- Use **squared distance** comparisons (compare `dx*dx + dy*dy` against `threshold*threshold`) to eliminate sqrt
- Only check sun exposure every 30-60 frames, not every frame
- Use the spatial hash grid from 1.3 to only update items near the player

**Impact:** Eliminates 200+ sqrt calls per frame.

---

### 1.5 Block Rendering - Pre-render Textures (P1)

**Problem:** `drawBlock()` in `rendering.tsx` draws 8+ small rectangles per block every frame for texture detail. With ~800 visible blocks (25x32 viewport), that's 6,400+ fillRect calls per frame just for terrain.

**File:** `render/rendering.tsx` lines 38-58, `render/drawTerrain.ts`

**Plan:**
- **Pre-render each block type** to an offscreen canvas (32x32) once at startup
- Use `ctx.drawImage(offscreenCanvas, ...)` instead of multi-rect drawing per block
- This reduces per-block cost from 8+ draw calls to 1 drawImage call
- Consider using `ImageBitmap` for even faster blitting

**Impact:** Terrain rendering becomes ~8x faster. Most significant visible FPS improvement.

---

### 1.6 Canvas Context State Management (P2)

**Problem:** Scattered `ctx.save()`, `ctx.restore()`, `ctx.globalAlpha = 1` calls throughout render functions. Each save/restore pushes/pops the entire context state.

**Files:** `drawGame.ts`, `drawTerrain.ts`, `drawOverlays.ts`, `drawPlayer.ts`

**Plan:**
- Minimize save/restore to only where truly needed (transforms, clipping)
- Track globalAlpha manually and only set when changing
- Batch draw calls by shared state (same fillStyle, same globalAlpha)

---

## 2. PERFORMANCE - Collision & Physics

### 2.1 Spatial Partitioning for Collision Detection (P1)

**Problem:** `checkCollision()` in `useGameLoop.ts` iterates all tiles in a bounding box. This is called for player movement AND every animal's movement. With 80 animals, collision checking dominates frame time.

**File:** `hooks/useGameLoop.ts` lines 168-189

**Plan:**
- Tile-based collision is already spatially indexed by nature (direct array lookup), but the current loop over all tiles in bounding box can be optimized
- Cache solid block lookups in a bitfield or typed array for O(1) access
- For entity-to-entity collision (player vs animals, animal vs animal), use the spatial hash grid from 1.3

---

### 2.2 Decouple Physics from Frame Rate (P2)

**Problem:** Physics runs once per `requestAnimationFrame` call. If the frame rate drops below 60 FPS, physics slows down. If it spikes, physics speeds up.

**Files:** `useGameLoop.ts`, `updatePlayerSystem.ts`, `updateAnimalSystem.ts`

**Plan:**
- Implement a **fixed timestep** game loop:
  ```
  accumulator += deltaTime
  while (accumulator >= FIXED_DT) {
    updatePhysics(FIXED_DT)
    accumulator -= FIXED_DT
  }
  render(interpolation = accumulator / FIXED_DT)
  ```
- Use `performance.now()` for accurate delta timing
- This ensures consistent physics regardless of frame rate

---

## 3. MEMORY & RESOURCE MANAGEMENT

### 3.1 Sound System Overhaul (P1)

**Problem:** `SoundEngine.ts` creates a new oscillator/buffer for every sound. No pooling, no cleanup. With 80 animals each having a 0.2% chance to play sound per frame, audio nodes accumulate. Web Audio has a practical limit on concurrent sources.

**File:** `utils/SoundEngine.ts`

**Plan:**
- Implement a **sound pool** with a maximum of 8-12 concurrent sounds
- Pre-allocate noise buffers (reuse instead of creating per call)
- Add `oscillator.disconnect()` after stop to free audio graph nodes
- Priority system: player sounds override ambient animal sounds
- Spatial audio: volume based on distance from player (currently all sounds are full volume)

---

### 3.2 Reduce Per-Frame Allocations (P2)

**Problem:** Many functions create temporary objects/arrays every frame:
- `Object.entries()` in furnace loop creates new array
- Animal count dictionaries recreated every 60 frames
- `Array.from()` in star rendering

**Files:** `updateWorldSystem.ts`, `updateAnimalSystem.ts`, `constants.ts`

**Plan:**
- Pre-allocate reusable objects for frequently-created temporaries
- Use `for...in` or cached arrays instead of `Object.entries()`
- Move star array to a typed Float32Array computed once

---

## 4. ARCHITECTURE & CODE QUALITY

### 4.1 Eliminate Duplicated Animal Definitions (P1)

**Problem:** Animal properties (width, height, health, maxHealth) are defined in two separate places:
1. `world.ts` lines 536-582 (initial spawn)
2. `updateAnimalSystem.ts` lines 196-252 (respawn)

If one is updated without the other, animals will have inconsistent stats.

**Plan:**
- Create a single `ANIMAL_DEFINITIONS` registry:
  ```typescript
  const ANIMAL_DEFINITIONS: Record<AnimalType, {
    width: number; height: number;
    health: number; maxHealth: number;
    spawnBiomes: number[]; maxCount: number;
  }> = { ... }
  ```
- Both spawn and respawn reference this single source of truth
- Place in a new file `src/components/game/animalDefinitions.ts` or in `constants.ts`

---

### 4.2 Replace Biome Magic Numbers with Enum (P1)

**Problem:** Biomes are referenced as raw integers (0-9) throughout `world.ts` and `updateAnimalSystem.ts`. Example: `biomeIndex === 3` for Ocean. Fragile and hard to read.

**File:** `world.ts`, `updateAnimalSystem.ts`

**Plan:**
- Add a `BiomeType` enum:
  ```typescript
  enum BiomeType {
    FOREST = 0, DESERT = 1, SNOW = 2, OCEAN = 3,
    MOUNTAIN = 4, SNOWY_MOUNTAIN = 5, VOLCANO = 6,
    SWAMP = 7, JUNGLE = 8, BADLANDS = 9,
  }
  ```
- Replace all numeric biome references with enum values
- Store biome type per chunk/column for efficient lookup

---

### 4.3 Strengthen TypeScript Interfaces (P2)

**Problem:** `Animal` and `Player` interfaces have many optional properties (`maxHealth?`, `regenTimer?`, `aggro?`, `breath?`) that are actually always present after initialization. Code uses non-null assertions (`!`) or unsafe access.

**File:** `types.ts`

**Plan:**
- Make runtime-required properties non-optional in the interface
- Initialize all properties in spawn functions (no more `undefined` defaults)
- Remove all non-null assertions (`!`) in favor of proper initialization
- Consider splitting into sub-interfaces: `BaseAnimal`, `PredatorAnimal`, `AquaticAnimal`

---

### 4.4 Extract Game Config from Scattered Constants (P2)

**Problem:** Game-tuning values (damage amounts, spawn rates, cooldown timers, food values, etc.) are hardcoded inline across update files. Tuning gameplay requires hunting through 1000+ line files.

**Plan:**
- Create a `gameConfig.ts` with categorized constants:
  ```typescript
  export const COMBAT = { CACTUS_DMG: 1, MAGMA_DMG: 2, FALL_DMG_THRESHOLD: 6, ... }
  export const HUNGER = { APPLE_VALUE: 2, COOKED_MEAT_VALUE: 4, STARVATION_DMG: 1, ... }
  export const SPAWNING = { MAX_PIGS: 10, MAX_SNAKES: 8, DESPAWN_DISTANCE: 3000, ... }
  ```
- Makes gameplay tuning a single-file operation

---

### 4.5 Separate Game State from React State (P2)

**Problem:** Game state lives in a `useRef<GameState>` but React re-renders are triggered by separate `useState` hooks that mirror portions of it (`inventory`, `health`, `hunger`, `isDead`, `cursorItem`). Synchronizing these is error-prone and causes redundant updates.

**File:** `Game.tsx`, `useGameLoop.ts`

**Plan:**
- Use a **pub/sub** or **event emitter** pattern: game loop publishes state changes, React subscribes to only the slices it needs
- Alternatively, use `useSyncExternalStore` (React 18+) to derive React renders directly from the game state ref
- Eliminates the manual `setInventory`, `setHealth`, etc. calls and the race conditions between ref and state

---

## 5. GAMEPLAY & FEATURES

### 5.1 World Persistence / Save System (P2)

**Problem:** The world is regenerated from scratch every page load. All progress is lost.

**Plan:**
- Serialize game state to `localStorage` or `IndexedDB`
- Save: player position/inventory, modified chunks (diff from generated), furnace state, discovered items
- Auto-save every 30 seconds + on page unload
- Only store chunks that differ from procedural generation (compact delta format)

---

### 5.2 Improve World Generation Quality (P2)

**Problem:** Terrain uses simple sine-based noise (`Math.sin(x * 0.01) + Math.sin(x * 0.03)`) which produces repetitive, predictable landscapes. No caves, no underground structures.

**File:** `world.ts` lines 135-148

**Plan:**
- Replace sine noise with **simplex/Perlin noise** (plenty of lightweight JS implementations)
- Add cave generation using 2D noise thresholds
- Add underground structures (dungeons, mineshafts)
- Add biome blending at edges (smooth transitions instead of sharp cuts)

---

### 5.3 Lighting System (P3)

**Problem:** No lighting system. Underground is fully visible, caves/overhangs have no shadow.

**Plan:**
- Implement a simple **tile-based light map**:
  - Sun casts light downward from sky
  - Furnaces/magma emit local light
  - Propagate light values using flood fill
  - Render light as a dark overlay with alpha = 1 - lightLevel
- Update only when blocks change (not every frame)

---

### 5.4 Inventory Slot System (P3)

**Problem:** Inventory is a `Record<number, number>` (block type -> count) rather than a slot-based system. This means no duplicate stacks, no slot arrangement, and no hotbar slot assignment.

**Plan:**
- Refactor to slot-based: `InventorySlot[] = Array<{ type: BlockType, count: number } | null>`
- 36 inventory slots (4 rows of 9) + 9 hotbar slots
- Enables: drag-and-drop rearrangement, multiple stacks of same item, equipment slots

---

## 6. BUG FIXES

### 6.1 Float Comparison in Animal Targeting (P1)

**Problem:** `updateAnimalSystem.ts` line ~684 compares `animal.x === targetX` with floating-point values. This will almost never be true due to floating-point precision.

**Fix:** Use `Math.abs(animal.x - targetX) < threshold` (e.g., threshold = 2).

---

### 6.2 Undefined fallStartY Causes NaN Damage (P1)

**Problem:** `updatePlayerSystem.ts` calculates fall damage as `(player.y - player.fallStartY) / TILE_SIZE`. If `fallStartY` is `undefined`, the result is `NaN`, which propagates through health calculations.

**Fix:** Guard with `if (player.fallStartY !== undefined)` before calculating fall damage.

---

### 6.3 Non-null Assertions on Uninitialized Properties (P1)

**Problem:** `updateAnimalSystem.ts` uses `animal.attackCooldown!` and `animal.maxHealth!` with non-null assertions, but these may be `undefined` if the animal was spawned without initialization.

**Fix:** Initialize all animal properties in the spawn function. Remove all `!` assertions.

---

### 6.4 Furnace Key Parsing Without Validation (P2)

**Problem:** `updateWorldSystem.ts` parses furnace IDs with `id.split(',').map(Number)` and accesses `state.world[fx][fy]` without bounds checking.

**Fix:** Add bounds check: `if (fx >= 0 && fx < WORLD_WIDTH && fy >= 0 && fy < WORLD_HEIGHT)`

---

### 6.5 Spawn Loop Can Hang (P2)

**Problem:** `getValidSpawnX()` in `world.ts` attempts 50 random positions. If none are valid (e.g., all ocean), it silently uses invalid coordinates. Could potentially loop excessively with bad RNG.

**Fix:** Add a fallback spawn at known-good coordinates after max attempts.

---

## 7. DEVELOPER EXPERIENCE

### 7.1 Add Performance Monitoring (P2)

**Plan:**
- Add an FPS counter overlay (toggleable with a key)
- Track and display: frame time, update time, render time, entity count, memory usage
- Log warnings when frame time exceeds 16.67ms

---

### 7.2 Add Debug Visualization (P3)

**Plan:**
- Toggleable overlays for: collision boxes, spatial hash grid cells, biome boundaries, animal AI state, pathfinding targets
- Chunk boundaries and load state visualization

---

### 7.3 Hot-reload Game Config (P3)

**Plan:**
- With the extracted `gameConfig.ts` from 4.4, Vite's HMR can hot-reload gameplay values
- Enables rapid iteration on damage values, spawn rates, physics tuning without full page reload

---

## 8. FUTURE CONSIDERATIONS

### 8.1 WebGL Renderer (P3)

When canvas 2D becomes the bottleneck (likely after lighting + more entities), consider migrating to WebGL:
- Batch all tile rendering into a single draw call via sprite atlas + instanced quads
- GPU-accelerated lighting via shaders
- Libraries: PixiJS or raw WebGL2

### 8.2 Web Worker for Game Logic (P3)

Move the game update loop to a Web Worker:
- Main thread only handles input + rendering
- Worker handles physics, AI, world generation
- Communicate via `SharedArrayBuffer` or structured clone
- Prevents UI jank from heavy game updates

### 8.3 Multiplayer Foundation (P3)

If multiplayer is ever desired:
- Current architecture (mutable shared state) would need refactoring to authoritative server model
- The spatial hash grid (1.3) and chunked world (1.1) are prerequisites
- Consider ECS (Entity Component System) architecture for scalability

---

## Recommended Implementation Order

| Phase | Items | Goal |
|-------|-------|------|
| **Phase 1: Stability** | 6.1, 6.2, 6.3, 6.4, 6.5 | Fix active bugs |
| **Phase 2: Memory** | 1.2, 3.1 | Eliminate memory explosion |
| **Phase 3: Core Perf** | 1.3, 1.4, 1.5 | Smooth 60 FPS with many entities |
| **Phase 4: Architecture** | 4.1, 4.2, 4.3 | Code quality for maintainability |
| **Phase 5: World** | 1.1, 5.2 | Chunked generation + better terrain |
| **Phase 6: Gameplay** | 5.1, 5.4 | Save system + proper inventory |
| **Phase 7: Polish** | 2.2, 4.4, 4.5, 5.3 | Fixed timestep, lighting, clean config |
| **Phase 8: Future** | 8.1, 8.2 | WebGL, workers if needed |

---

*Generated from full codebase review on 2026-03-30*
