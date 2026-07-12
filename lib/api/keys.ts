import { createHash, randomBytes } from "node:crypto";

// API key lifecycle: the raw token is shown to the admin exactly once at creation; only its
// sha256 hash is stored (api_keys.key_hash), so a database leak never leaks usable keys. The
// prefix is stored alongside for display ("hd_ab12cd34…"). Mirrored by tests/api-security.test.ts.

const TOKEN_PREFIX = "hd_";
const TOKEN_BYTES = 20; // 40 hex chars
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 8;

export interface GeneratedApiKey {
  token: string;
  prefix: string;
  hash: string;
}

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const token = `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("hex")}`;
  return {
    token,
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
    hash: hashApiKey(token),
  };
}
