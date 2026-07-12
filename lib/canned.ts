// Pure canned-response logic — no I/O, mirrored by tests/canned-responses.test.ts.

export interface CannedResponseLike {
  id: string;
  shortcut: string;
  title: string;
  body: string;
}

/**
 * Filter and rank canned responses for the composer picker. A leading "/" (the trigger character
 * the agent typed) is ignored. Shortcut-prefix matches rank above title-substring matches so
 * muscle-memory shortcuts always surface first.
 */
export function filterCannedResponses<T extends CannedResponseLike>(
  responses: T[],
  query: string,
): T[] {
  const q = query.replace(/^\//, "").trim().toLowerCase();

  if (!q) {
    return [...responses].sort((a, b) => a.shortcut.localeCompare(b.shortcut));
  }

  const shortcutMatches: T[] = [];
  const titleMatches: T[] = [];
  for (const response of responses) {
    if (response.shortcut.toLowerCase().startsWith(q)) {
      shortcutMatches.push(response);
    } else if (response.title.toLowerCase().includes(q)) {
      titleMatches.push(response);
    }
  }
  return [...shortcutMatches, ...titleMatches];
}

/**
 * Substitute {{variable}} placeholders. Supports an inline fallback: {{contact_name|there}} renders
 * the fallback when the variable has no value. Text outside double braces is left untouched.
 */
export function renderCannedResponse(
  body: string,
  variables: Record<string, string | undefined>,
): string {
  return body.replace(/\{\{\s*([\w]+)\s*(?:\|([^}]*))?\}\}/g, (_match, name: string, fallback?: string) => {
    return variables[name] ?? fallback ?? "";
  });
}
