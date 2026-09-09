import type { ArchiveRecord } from "./catalog";
export const SESSION_KEY = "rhine-blog:archive-session:v1";
export const SAVED_KEY = "rhine-blog:saved:v1";
export const SETTINGS_KEY = "rhine-blog:settings:v1";
export interface ArchiveSession {
  version: 1;
  selectedId: string;
  memory: string[];
  mode: "archive" | "detail";
}
export function restoreSession(
  raw: unknown,
  records: ArchiveRecord[],
  columnFiles: (lane: number) => number[],
) {
  const value =
    raw && typeof raw === "object" ? (raw as Partial<ArchiveSession>) : {};
  const memories = Array.from({ length: 5 }, (_, lane) => {
    const candidate = Array.isArray(value.memory)
      ? records.findIndex(
          (r) => r.id === value.memory![lane] && r.lane === lane,
        )
      : -1;
    return candidate >= 0 ? candidate : columnFiles(lane)[0];
  });
  const found =
    value.version === 1
      ? records.findIndex((r) => r.id === value.selectedId)
      : -1;
  return {
    selected: found >= 0 ? found : 0,
    memory: memories,
    mode:
      found >= 0 && !records[found].empty && value.mode === "detail"
        ? ("detail" as const)
        : ("archive" as const),
    restored: found >= 0,
  };
}
export function readStorage(
  storage: Storage,
  key: string,
  fallback: unknown,
): unknown {
  try {
    return JSON.parse(storage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
