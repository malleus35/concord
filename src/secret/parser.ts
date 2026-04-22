export interface ParsedExpression {
  scheme: string;
  value: string;
  /** E-11 default (colon-dash variant). */
  default: string | undefined;
  /** E-11 optional marker (`?` suffix). */
  optional: boolean;
  /** Original expression text including braces. */
  raw: string;
}

/**
 * Parse ONE expression. Caller is responsible for finding boundaries.
 * E-13 escape (`{{env:X}}`) is NOT handled here — use findAllExpressions.
 * E-19 Windows: first `:` separates scheme; rest of body is value (may contain `:`).
 */
export function parseExpression(raw: string): ParsedExpression {
  if (!raw.startsWith("{") || !raw.endsWith("}")) {
    throw new Error(`parseExpression: malformed brace: ${raw}`);
  }
  const body = raw.slice(1, -1);
  const firstColon = body.indexOf(":");
  if (firstColon === -1) {
    throw new Error(`parseExpression: missing scheme separator: ${raw}`);
  }
  const scheme = body.slice(0, firstColon);
  let rest = body.slice(firstColon + 1);
  let optional = false;
  let defaultValue: string | undefined;

  // E-11 optional suffix `?` (must be last char, not part of default)
  if (rest.endsWith("?") && !rest.includes(":-")) {
    optional = true;
    rest = rest.slice(0, -1);
  }
  // E-11 default `:-default`
  const defaultIdx = rest.indexOf(":-");
  if (defaultIdx !== -1) {
    defaultValue = rest.slice(defaultIdx + 2);
    rest = rest.slice(0, defaultIdx);
  }

  return {
    scheme,
    value: rest,
    default: defaultValue,
    optional,
    raw,
  };
}

/**
 * Find all `{scheme:...}` in a string, skipping `{{...}}` escape (E-13).
 * Returns parsed expressions in order of appearance.
 */
export function findAllExpressions(input: string): ParsedExpression[] {
  const results: ParsedExpression[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === "{" && input[i + 1] === "{") {
      // E-13 escape — skip `{{...}}`
      const end = input.indexOf("}}", i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    if (input[i] === "{") {
      const end = input.indexOf("}", i + 1);
      if (end === -1) break;
      const raw = input.slice(i, end + 1);
      try {
        results.push(parseExpression(raw));
      } catch {
        // malformed — skip
      }
      i = end + 1;
      continue;
    }
    i++;
  }
  return results;
}
