# 2D Minecraft

A browser-based 2D sandbox game built with React, TypeScript, Vite, and Canvas 2D. The game includes procedural terrain, biomes, animals, crafting, smelting, persistence, weather, combat, and a large streamed world.

## Run Locally

Prerequisite: Node.js

```bash
npm install
npm run dev
```

The dev server runs on port 3000 by default.

## Scripts

```bash
npm test          # Run Vitest tests
npm run lint      # Run TypeScript checks
npm run build     # Build production assets
npm run preview   # Preview the production build
npm run worker:preview  # Build and preview with Wrangler
npm run worker:deploy   # Build and deploy to Cloudflare Workers
```

## Deploy To Cloudflare Workers

This project is configured for Cloudflare Workers Static Assets with `wrangler.jsonc`. It serves the Vite production build from `dist` and falls back to `index.html` for SPA navigation.

Prerequisites:

- Wrangler available on your `PATH`
- Cloudflare authentication already configured with `wrangler login`

Deploy:

```bash
npm run worker:deploy
```

Preview the Worker locally:

```bash
npm run worker:preview
```

## Controls

- `A` / `D` or left / right arrows: move
- `W`, up arrow, or space: jump or swim upward
- Mouse move: aim
- Left click: mine blocks or attack animals
- Right click: place blocks, eat food, tame eligible animals, or open furnaces
- `E` or `I`: open or close inventory
- `Esc`: close inventory
- `C`: toggle controls overlay
- `H`: toggle hotbar
- Hold `G`: rewind recent player/entity state

## Debug Controls

Debug controls are disabled by default so gameplay keys cannot trigger destructive actions. Enable them for the current browser by opening the game with `?debugControls` or by setting local storage:

```js
localStorage.setItem('blockbuilder_debug_controls', '1')
```

When enabled:

- `` ` ``: toggle debug overlay
- `Alt+Shift+K`: force death
- `Alt+Shift+R`: toggle auto-respawn
- `Alt+Shift+F`: toggle flying
- Hold `Alt+Shift+V`: slow motion

## Save Data

The game auto-saves to `localStorage` every 30 seconds and before page unload. A new game clears the current save.

## Current Architecture

- `src/components/Game.tsx`: React shell and overlay state bridge
- `src/components/game/runtime.ts`: core game state and initial state
- `src/components/game/update/`: gameplay systems
- `src/components/game/render/`: canvas drawing
- `src/components/game/world/`: deterministic terrain generation, streamed world store, and spawning
- `src/components/game/persistence.ts`: save/load logic
- `src/components/game/crafting.ts`: crafting and mining rules

## Mobile Orientation

The game prefers landscape on phones and tablets. Installed web apps request
landscape through the web app manifest. On supported mobile browsers, **Try
landscape fullscreen** requests fullscreen and then locks orientation when the
user taps it. Browsers that block orientation locking (including iOS Safari)
instead show a prompt to turn the device sideways. The game adjusts its canvas
to the actual viewport when the screen rotates or fullscreen changes.

Orientation support is separate from input support: gameplay still uses the
keyboard and mouse controls listed above; this update does not introduce
on-screen movement, mining, or building controls.
