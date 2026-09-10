import { createHash } from "node:crypto";

/** Read-only audit. Retirement records never rewrite the original baseline. */
export async function auditBaseline(original, retirement, read) {
  const failures = [];
  const retired = new Map();
  for (const entry of retirement.files) {
    if (retired.has(entry.path)) failures.push(`${entry.path}: duplicate retirement`);
    retired.set(entry.path, entry);
    try {
      await read(entry.path);
      failures.push(`${entry.path}: retired file reappeared`);
    } catch (error) {
      if (error?.code !== "ENOENT") failures.push(`${entry.path}: cannot verify absence (${error?.code ?? "read error"})`);
    }
  }
  let preserved = 0, retiredFromBaseline = 0;
  for (const entry of original.files) {
    const removed = retired.get(entry.path);
    if (removed) {
      if (removed.sha256 !== entry.sha256 || removed.bytes !== entry.bytes)
        failures.push(`${entry.path}: retirement does not match original baseline`);
      retiredFromBaseline++;
      continue;
    }
    try {
      const bytes = await read(entry.path);
      if (bytes.length !== entry.bytes || createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
        failures.push(`${entry.path}: modified`);
      else preserved++;
    } catch (error) {
      failures.push(`${entry.path}: missing or unreadable (${error?.code ?? "read error"})`);
    }
  }
  return { preserved, retiredFromBaseline, retiredTotal: retired.size, failures };
}
