// Signed-in sessions: the user signs a short message (wallet or zkLogin), we verify it once and set
// an HMAC-signed, httpOnly cookie. Requests then run as that user's own agent.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { agent } from "./agent";

const COOKIE = "mandate_session";
const TTL_MS = 2 * 24 * 3600 * 1000;

const sign = (body: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(body).digest("base64url");

export function loginMessage(address: string, issuedAt: string) {
  return `Sign in to MANDATE\naddress: ${address}\nissued: ${issuedAt}`;
}

export async function setSession(address: string) {
  const body = Buffer.from(JSON.stringify({ a: address, exp: Date.now() + TTL_MS })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: TTL_MS / 1000 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in owner address, or null. */
export async function sessionOwner(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !process.env.SESSION_SECRET) return null;
  const [body, mac] = v.split(".");
  const expected = sign(body);
  if (!mac || mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const { a, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
  return Date.now() < exp ? a : null;
}

/**
 * Run fn as the signed-in user's agent when they have one set up; otherwise as the demo agent.
 * { setup: true } also runs as the user while they have an agent but no mandate yet.
 */
export async function asSessionAgent<T>(fn: () => Promise<T>, opts: { setup?: boolean } = {}): Promise<T> {
  return runAs(await sessionOwner(), fn, opts);
}

/** Same, for an owner read earlier (e.g. before a response stream starts, when cookies are gone). */
export async function runAs<T>(owner: string | null, fn: () => Promise<T>, opts: { setup?: boolean } = {}): Promise<T> {
  if (!owner) return fn();
  const a = await agent();
  const me = await a.getUserAgent(owner);
  if (!me || (!me.grantId && !opts.setup)) return fn();
  return a.asUser(owner, fn, { setup: opts.setup });
}
