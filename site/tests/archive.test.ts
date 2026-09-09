import test from "node:test";
import assert from "node:assert/strict";
import { readPosts } from "../src/lib/posts.ts";
import {
  makeCatalog,
  tickWindow,
  type ArchivePost,
} from "../src/archive/catalog.ts";
import { createLoop, visibleCell, cellKey, wrap } from "../src/archive/loop.ts";
import { restoreSession } from "../src/archive/state.ts";
const input = (await readPosts()).map((p) => ({
  ...p,
  headings: [],
})) as ArchivePost[];
const catalog = makeCatalog(input);
const loop = createLoop(catalog);

test("five unequal lanes keep actual article counts and a bounded eight-tick window", () => {
  assert.deepEqual(
    Array.from({ length: 5 }, (_, lane) => catalog.columnFiles(lane).length),
    [29, 6, 1, 1, 1],
  );
  for (let lane = 0; lane < 5; lane++) {
    const files = catalog.columnFiles(lane);
    for (const selected of files) {
      const ticks = tickWindow(files, selected);
      assert.ok(ticks.includes(selected));
      assert.ok(ticks.length <= 8);
      assert.equal(new Set(ticks).size, ticks.length);
    }
  }
});
test("30,000 mixed moves including coordinate rebases preserve direction and identity", () => {
  let selected = 0,
    cell = { lane: 0, row: 12 },
    origin = { lane: 0, row: 0 };
  const memory = Array.from(
    { length: 5 },
    (_, lane) => catalog.columnFiles(lane)[0],
  );
  for (let n = 0; n < 30000; n++) {
    const axis = n % 113 < 90 ? "row" : "lane";
    const direction = n < 15000 ? 1 : -1;
    const lane = catalog.fileLocation(selected).lane;
    if (axis === "row") {
      const files = catalog.columnFiles(lane);
      selected = files[wrap(files.indexOf(selected) + direction, files.length)];
    } else selected = memory[wrap(lane + direction, 5)];
    const next = loop.selectionCell(
      selected,
      cell,
      { axis, direction },
      origin,
    );
    assert.equal(next[axis] - cell[axis], direction);
    assert.equal(loop.fileAtCell(next, origin), selected);
    memory[catalog.fileLocation(selected).lane] = selected;
    cell = next;
    // Exactly the upstream phase-preserving rebase, with origin-aware blog lookup.
    const shift = {
      lane:
        Math.abs(cell.lane) > 2048 ? Math.round((cell.lane - 2) / 5) * 5 : 0,
      row: Math.abs(cell.row) > 2048 ? Math.floor((cell.row - 12) / 8) * 8 : 0,
    };
    cell = { lane: cell.lane - shift.lane, row: cell.row - shift.row };
    origin = { lane: origin.lane + shift.lane, row: origin.row + shift.row };
    assert.equal(loop.fileAtCell(cell, origin), selected);
  }
});
test("single article lane moves to adjacent occurrences rather than inventing items", () => {
  const index = catalog.columnFiles(3)[0];
  let cell = { lane: 3, row: 12 };
  for (let n = 0; n < 80; n++) {
    const next = loop.selectionCell(index, cell, {
      axis: "row",
      direction: -1,
    });
    assert.equal(next.row, cell.row - 1);
    assert.equal(loop.fileAtCell(next), index);
    cell = next;
  }
});
test("visible pool stays 288 unique cells for arbitrarily large content arrays", () => {
  for (const center of [
    { lane: 0, row: 12 },
    { lane: -411.1, row: 6000.5 },
  ]) {
    const pool = Array.from({ length: 288 }, (_, index) =>
      visibleCell(index, center),
    );
    assert.equal(new Set(pool.map(cellKey)).size, 288);
  }
  const more = makeCatalog(
    Array.from({ length: 150 }, (_, i) => ({
      ...input[0],
      id: `new:${i}`,
      slug: `new-${i}`,
    })),
  );
  const virtual = createLoop(more);
  const index = 149;
  const cell = virtual.selectionCell(index, { lane: 0, row: 12 });
  assert.equal(virtual.fileAtCell(cell), index);
});
test("empty lanes are non-readable placeholders; valid posts never require eight items", () => {
  const c = makeCatalog([input[0]]);
  assert.equal(c.records.filter((r) => !r.empty).length, 1);
  assert.equal(c.records.filter((r) => r.empty).length, 4);
  for (let lane = 0; lane < 5; lane++)
    assert.equal(c.columnFiles(lane).length, 1);
  assert.equal(makeCatalog([]).records.filter((r) => r.empty).length, 5);
});
test("session restore uses IDs, survives reorder/deletion, rejects corrupt state", () => {
  const selected = catalog.columnFiles(1)[3];
  const data = {
    version: 1,
    selectedId: catalog.records[selected].id,
    memory: Array.from(
      { length: 5 },
      (_, lane) => catalog.records[catalog.columnFiles(lane)[0]].id,
    ),
    mode: "detail",
  };
  const reordered = makeCatalog([...input].reverse());
  const restored = restoreSession(
    data,
    reordered.records,
    reordered.columnFiles,
  );
  assert.equal(reordered.records[restored.selected].id, data.selectedId);
  assert.equal(restored.mode, "detail");
  const removed = makeCatalog(input.filter((p) => p.id !== data.selectedId));
  assert.equal(
    restoreSession(data, removed.records, removed.columnFiles).restored,
    false,
  );
  assert.equal(
    restoreSession("corrupt", catalog.records, catalog.columnFiles).selected,
    0,
  );
});
