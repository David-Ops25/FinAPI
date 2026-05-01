/**
 * Parses compact duration strings used by JWT TTL env vars (e.g. 10m, 7d, 24h).
 */
export function durationStringToMs(input: string): number {
  const s = input.trim().toLowerCase();
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(s);
  if (!match) {
    throw new Error(`Invalid duration string: ${input}`);
  }
  const n = Number(match[1]);
  const u = match[2];
  switch (u) {
    case "ms":
      return n;
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return n;
  }
}
