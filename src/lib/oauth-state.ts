import { createHmac } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "fallback-secret";

/** Sign userId + platform + timestamp into a base64url state token */
export function createOAuthState(userId: string, platform: string, extra = ""): string {
  const ts = Date.now();
  const payload = `${userId}|${platform}|${ts}|${extra}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

/** Verify and decode state. Returns null if invalid/expired (10 min window). */
export function verifyOAuthState(state: string): { userId: string; platform: string; extra: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const parts = decoded.split("|");
    if (parts.length < 5) return null;
    const sig = parts.pop()!;
    const [userId, platform, ts, ...extraParts] = parts;
    const extra = extraParts.join("|");
    const payload = `${userId}|${platform}|${ts}|${extra}`;
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
    if (sig !== expected) return null;
    if (Date.now() - parseInt(ts) > 15 * 60 * 1000) return null; // 15 min window
    return { userId, platform, extra };
  } catch {
    return null;
  }
}

export function appUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
