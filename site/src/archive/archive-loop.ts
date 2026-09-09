import { records, columnFiles, fileLocation } from "./data";
import { createLoop } from "./loop";
export * from "./loop";
export const { fileAtCell, selectionCell } = createLoop({
  records,
  columnFiles,
  fileLocation,
});
