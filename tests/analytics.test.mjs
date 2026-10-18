import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Use the real TypeScript module in a fake browser without contacting production.
// The shared client has separate protocol and clock tests in the games repository.
const original = readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(original, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function browser(origin) {
  const scripts = [], emitted = [], bound = [];
  const win = { location: { origin } };
  const doc = {
    createElement(tag) {
      assert.equal(tag, 'script');
      return {
        dataset: {},
        handlers: new Map(),
        addEventListener(kind, callback) { this.handlers.set(kind, callback); },
        fire(kind) { this.handlers.get(kind)?.(); },
      };
    },
    head: { append(script) { scripts.push(script); } },
  };
  const exports = {};
  runInNewContext(compiled, { exports, window: win, document: doc, Map });
  return { api: exports, win, scripts, emitted, bound,
    enableClient() {
      win.hubTrack = (game, kind) => emitted.push({ game, kind });
      win.hubAnalytics = { bindPlaying: (game, predicate) => bound.push({ game, predicate }) };
      scripts[0].fire('load');
    },
  };
}

test('canonical production host opts in once, buffers events and exposes playing', () => {
  const b = browser('https://2d-minecraft.orangely.xyz');
  let active = false;
  b.api.initAnalytics(() => active);
  b.api.initAnalytics(() => active);
  assert.equal(b.scripts.length, 1, 'no duplicate script on remount');
  assert.equal(b.scripts[0].src, 'https://games.orangely.xyz/analytics.js');
  assert.equal(b.scripts[0].async, true);
  assert.equal(b.scripts[0].dataset.analyticsGame, 'minecraft');
  assert.equal(b.scripts[0].dataset.analyticsExternal, 'true');
  assert.equal(b.win.__gamesAnalyticsPlaying.get('minecraft')(), false);
  b.api.track('play');
  b.api.track('finish');
  assert.deepEqual(b.emitted, [], 'do not post direct legacy beacons during script load');
  active = true;
  assert.equal(b.win.__gamesAnalyticsPlaying.get('minecraft')(), true);
  b.enableClient();
  assert.deepEqual(b.emitted, [
    { game: 'minecraft', kind: 'play' },
    { game: 'minecraft', kind: 'finish' },
  ]);
  assert.equal(b.bound.at(-1).predicate(), true);
  b.api.initAnalytics(() => false);
  assert.equal(b.win.__gamesAnalyticsPlaying.get('minecraft')(), false);
  assert.equal(b.scripts.length, 1);
  b.api.track('play');
  assert.equal(b.emitted.length, 3);
});

test('previews, localhost and unrelated hosts never load or report', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:4173',
    'https://feature.example.workers.dev', 'https://another.orangely.xyz']) {
    const b = browser(origin);
    b.api.initAnalytics(() => true);
    b.api.track('play');
    assert.equal(b.scripts.length, 0, origin);
    assert.deepEqual(b.emitted, []);
  }
});

test('failed client load stays optional and drops queued events', () => {
  const b = browser('https://2d-minecraft.orangely.xyz');
  b.api.initAnalytics(() => { throw new Error('broken gameplay getter'); });
  assert.equal(b.win.__gamesAnalyticsPlaying.get('minecraft')(), false);
  b.api.track('play');
  b.scripts[0].fire('error');
  b.api.track('finish');
  assert.deepEqual(b.emitted, []);
  assert.equal(b.scripts.length, 1);
});

test('bounded pre-load queue does not grow under failed network', () => {
  const b = browser('https://2d-minecraft.orangely.xyz');
  b.api.initAnalytics(() => true);
  for (let i = 0; i < 24; i++) b.api.track('play');
  b.enableClient();
  assert.equal(b.emitted.length, 16);
  assert.ok(b.emitted.every(x => x.game === 'minecraft' && x.kind === 'play'));
});
