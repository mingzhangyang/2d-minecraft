# Analytics V2 integration

This standalone game uses the existing anonymous **games** Analytics V2 client
(`https://games.orangely.xyz/analytics.js`) only on its canonical production
origin, **https://2d-minecraft.orangely.xyz**. Local development and Cloudflare preview domains do
not load the shared script or write production telemetry.

- Registry identity: `minecraft` in `mingzhangyang/games/games.config.json`.
- `open`: one page load, emitted by the shared script after its V2 Worker probe.
- `activeSeconds`: visible, focused, recently interacted page time, sampled
  by the shared client; not merely time the browser tab has been open.
- `playingSeconds`: active time while the game-owned read-only lifecycle
  callback returns true; no new game timers are installed.
- `play`/`finish`: original game-owned start/end conditions forwarded through
  `hubTrack`; no parallel legacy `sendBeacon` or `fetch`.
- Shared client failures and offline play are non-blocking. Buffered early
  play/finish events are bounded to 16 and discarded on script load error.
- No analytics cookies, persistent visitor IDs or external SDK dependencies.

The site and `games-analytics` Worker deploy separately. Confirm that the Worker
has the allowlisted game ID and origin from the merged games registry and its
existing D1 schema. No new D1 migration is needed for this client upgrade.

Local check: `npm run lint && npm run test:analytics && npm run build`.
The unit test uses a local fake browser and sends **no production requests**.
Manual production acceptance: reload once, play one real game, pause/finish
and confirm the game's V2 `opens`, `activeSeconds`, `playingSeconds`,
`p` and `f` through the existing `GET /stats?v=2` endpoint. Verify that
starting a new round doesn't add a second page open and that background,
idle and completed time is not counted as playing.

Game-specific playing predicate: the player is alive in the running sandbox. Inventory and crafting remain gameplay, and death pauses playing-time accumulation.
