/**
 * Normalize source code for typing.
 *
 * - Strip BOM
 * - Convert CRLF / CR to LF
 * - Strip trailing whitespace on each line (configurable)
 * - Trim a single trailing newline so we don't force the user to type one
 *   after the last visible character — but keep internal newlines.
 */
export function normalizeCode(
  raw: string,
  opts: { stripTrailingSpaces?: boolean } = {},
): string {
  let s = raw;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n?/g, "\n");
  if (opts.stripTrailingSpaces ?? true) {
    s = s.replace(/[ \t]+\n/g, "\n");
    s = s.replace(/[ \t]+$/g, "");
  }
  s = s.replace(/\n+$/g, "");
  return s;
}
