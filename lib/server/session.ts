import { createHmac, timingSafeEqual } from "crypto";
import type { StaffRole } from "@/lib/types";

// A login is a signed, httpOnly cookie set only by POST /api/auth/login
// after the server itself has checked the PIN. The browser can't read or
// forge it, so who's logged in (and their role) is decided here — never by
// anything the client claims about itself.
export const SESSION_COOKIE = "pos_session";

// Long enough to cover a full shift on a shared tablet; after that the
// device simply asks for the PIN again.
export const SESSION_MAX_AGE_SECONDS = 16 * 60 * 60;

export interface Session {
  staffId: string;
  role: StaffRole;
  // Logged in with the old shared PIN because this person has no PIN of
  // their own yet — until they set one, the proxy only lets them do that.
  mustSetPin?: boolean;
  exp: number; // epoch seconds
}

// Request headers the proxy sets after verifying the cookie, so route
// handlers can read the caller without re-verifying. The proxy strips any
// copy a client sends, so these can only ever come from the proxy.
export const SESSION_STAFF_HEADER = "x-pos-staff-id";
export const SESSION_ROLE_HEADER = "x-pos-role";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // Fail closed: without a real secret nobody gets a session, rather than
  // signing with something guessable.
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(
  staffId: string,
  role: StaffRole,
  options: { mustSetPin?: boolean } = {}
): string {
  const session: Session = {
    staffId,
    role,
    ...(options.mustSetPin ? { mustSetPin: true } : {}),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!session.staffId || !session.role || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

// For route handlers: the caller as verified by the proxy.
export function sessionFromRequest(request: Request): { staffId: string; role: StaffRole } | null {
  const staffId = request.headers.get(SESSION_STAFF_HEADER);
  const role = request.headers.get(SESSION_ROLE_HEADER) as StaffRole | null;
  return staffId && role ? { staffId, role } : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
