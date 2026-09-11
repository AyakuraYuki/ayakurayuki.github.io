import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import {
  ArchiveDrag,
  ArchivePlaneMomentum,
} from "../vendor/rhine/src/archive-drag.ts";
import { ThemeWave } from "../vendor/rhine/src/theme-motion.ts";
import { ArchiveVisibility } from "../vendor/rhine/src/archive-visibility.ts";
import { openingLayout } from "../vendor/rhine/src/viewport-layout.ts";

test("upgraded opening fills real viewport and preserves proportional central geometry", () => {
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1080],
    [390, 844],
    [844, 390],
  ]) {
    const l = openingLayout(width, height);
    assert.equal(l.kind, "opening");
    assert.ok(Math.abs(l.width * l.scale - width) < 0.001);
    assert.ok(Math.abs(l.height * l.scale - height) < 0.001);
  }
});
test("dynamic coverage depends on frustum, not pixel density or document count", () => {
  function cells(aspect: number) {
    const camera = new THREE.PerspectiveCamera(5, aspect, 5, 180);
    camera.position.set(-60, 38, 65);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const v = new ArchiveVisibility();
    const c = v.update(camera, 160, 0, 0, false);
    return { v, c };
  }
  const a = cells(16 / 9),
    b = cells(2560 / 1440),
    wide = cells(32 / 9);
  assert.ok(a.c.length > 0);
  assert.deepEqual(a.c, b.c);
  assert.ok(wide.c.length >= a.c.length);
  assert.equal(new Set(a.c.map((c) => `${c.lane}:${c.row}`)).size, a.c.length);
});
test("web super performance is an independent render override", async () => {
  const source = await readFile(
    "vendor/rhine/src/wallpaper-quality.ts",
    "utf8",
  );
  const preset =
    source.match(/superPerformanceQuality:[^=]+=[ ]*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(preset, /scale: 60/);
  assert.match(preset, /pixelRatio: 1/);
  assert.match(preset, /aoSamples: 0/);
  assert.match(preset, /shadows: 0/);
  assert.doesNotMatch(preset, /reduced/);
});
test("font shards and dependency patch retain pinned provenance", async () => {
  const lock = JSON.parse(
    await readFile("../migration/rhine-upstream.lock.json", "utf8"),
  );
  assert.equal(lock.commit, "3274778cbb8bb05ca2472d706c5879fa002ecd93");
  const shards = lock.importedFiles.filter(
    (f: { destination: string }) =>
      f.destination.startsWith("site/static/fonts/") &&
      f.destination.endsWith(".woff2"),
  );
  assert.ok(shards.length > 700);
  const css = await readFile("vendor/rhine/src/fonts.css", "utf8");
  assert.match(css, /unicode-range/);
  assert.match(css, /misans-webfont-4\.3\.1/);
  const p = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(
    p.scripts.prebuild,
    "node vendor/rhine/scripts/patch-rolling-number.mjs",
  );
});

test("release velocity affects both travel distance and plane direction", () => {
  const projection = { lane: { x: -80, y: 25 }, row: { x: 15, y: 32 } };
  function motion(milliseconds: number) {
    const drag = new ArchiveDrag();
    drag.start(0, 0, projection, 0);
    for (let i = 1; i <= 8; i++)
      drag.move(
        ((-80 * 2 + 15 * 3) * i) / 8,
        ((25 * 2 + 32 * 3) * i) / 8,
        (milliseconds * i) / 8,
      );
    assert.ok(Math.abs(drag.value.lane - 2) < 1e-8);
    assert.ok(Math.abs(drag.value.row - 3) < 1e-8);
    const velocity = drag.releaseVelocity(milliseconds, false);
    const move = new ArchivePlaneMomentum(drag.value, velocity);
    for (let i = 0; i < 1200 && move.phase !== "idle"; i++) move.step(1 / 60);
    assert.equal(move.phase, "idle");
    return move.value;
  }
  const fast = motion(80),
    slow = motion(400);
  assert.ok(fast.lane > slow.lane);
  assert.ok(fast.row > slow.row);
  assert.ok(
    fast.row > 6,
    "Not clamped to a fixed three-card follow-up distance",
  );
});
test("theme reversal starts from the current per-card colour", () => {
  const wave = new ThemeWave(),
    cell = { lane: 0, row: 12 };
  wave.set(true, 1, cell);
  wave.beginFrame();
  const midway = wave.sample(cell, 1.25);
  assert.ok(midway > 0 && midway < 1);
  wave.set(false, 1.25, cell);
  assert.equal(wave.sample(cell, 1.25), midway);
  assert.equal(wave.sample(cell, 3), 0);
});
