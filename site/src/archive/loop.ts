import type { makeCatalog } from "./catalog";
export type ArchiveCell = { lane: number; row: number };
export type ArchiveNavigation =
  { axis: "row" | "lane"; direction: number } | { cell: ArchiveCell };
export const LOOP_COLUMNS = 9,
  LOOP_ROWS = 32,
  COLUMN_SPACING = 5.2,
  ROW_SPACING = 0.62;
const POOL_LANES = [0, 1, 2, 3, 4, -2, -1, 5, 6];
export const wrap = (n: number, count: number) => ((n % count) + count) % count;
export const nearestOccurrence = (
  value: number,
  center: number,
  period: number,
) => value + Math.floor((center - value + period / 2) / period) * period;
export function createLoop(catalog: ReturnType<typeof makeCatalog>) {
  return {
    fileAtCell(cell: ArchiveCell, origin: ArchiveCell = { lane: 0, row: 0 }) {
      const files = catalog.columnFiles(wrap(cell.lane + origin.lane, 5));
      return files[wrap(cell.row + origin.row - 12, files.length)];
    },
    selectionCell(
      index: number,
      current: ArchiveCell,
      navigation?: ArchiveNavigation,
      origin: ArchiveCell = { lane: 0, row: 0 },
    ): ArchiveCell {
      if (navigation && "cell" in navigation) return { ...navigation.cell };
      const next = catalog.fileLocation(index);
      const row = nearestOccurrence(
        next.row - origin.row,
        current.row,
        catalog.columnFiles(next.lane).length,
      );
      if (navigation?.axis === "row")
        return { lane: current.lane, row: current.row + navigation.direction };
      return {
        lane:
          navigation?.axis === "lane"
            ? current.lane + navigation.direction
            : nearestOccurrence(next.lane - origin.lane, current.lane, 5),
        row,
      };
    },
  };
}
export const poolCell = (index: number) => ({
  lane: POOL_LANES[Math.floor(index / LOOP_ROWS)],
  row: index % LOOP_ROWS,
});
export const visibleCell = (index: number, center: ArchiveCell) => ({
  lane: nearestOccurrence(
    POOL_LANES[Math.floor(index / LOOP_ROWS)],
    center.lane,
    LOOP_COLUMNS,
  ),
  row: nearestOccurrence(index % LOOP_ROWS, center.row, LOOP_ROWS),
});
export const cellKey = (cell: ArchiveCell) => `${cell.lane}:${cell.row}`;
export const sameCell = (a: ArchiveCell, b: ArchiveCell) =>
  a.lane === b.lane && a.row === b.row;
