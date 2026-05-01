/**
 * static-outp-003: reduce script injection when JSON is later embedded in HTML contexts (defense in depth for API fields).
 */
export function encodeJsonSafeTextFragment(input: string): string {
  return input.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "").replace(/\u2029/g, "");
}
