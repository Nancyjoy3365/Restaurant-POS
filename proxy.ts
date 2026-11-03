import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_ROLE_HEADER,
  SESSION_STAFF_HEADER,
  verifySessionToken,
} from "@/lib/server/session";
import { allowedRoles, isAllowedBeforePinSetup, isPublicRoute } from "@/lib/server/permissions";

// Every /api request passes through here. Apart from the few login-screen
// routes in isPublicRoute, a request needs a valid signed session cookie
// (401 otherwise) and a role allowed for that route (403 otherwise) — the
// screens hiding a button is no longer the only thing stopping a call.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Never let a client supply its own identity headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SESSION_STAFF_HEADER);
  requestHeaders.delete(SESSION_ROLE_HEADER);

  if (isPublicRoute(method, pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let session;
  try {
    session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  } catch (err) {
    console.error("Session verification unavailable:", err);
    return NextResponse.json({ error: "Login is not configured on the server." }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  // Logged in with the old shared PIN: nothing else until they choose
  // their own PIN.
  if (session.mustSetPin && !isAllowedBeforePinSetup(method, pathname)) {
    return NextResponse.json(
      { error: "Choose your own PIN first.", code: "PIN_SETUP_REQUIRED" },
      { status: 403 }
    );
  }

  const forbidden = () =>
    NextResponse.json({ error: "Your role doesn't have access to this." }, { status: 403 });

  if (!allowedRoles(method, pathname).includes(session.role)) return forbidden();

  // Clocking in/out is only ever for yourself, unless you're an Admin.
  const clockMatch = pathname.match(/^\/api\/staff\/([^/]+)\/(clock-in|clock-out)$/);
  if (clockMatch && session.role !== "Admin" && clockMatch[1] !== session.staffId) {
    return forbidden();
  }

  requestHeaders.set(SESSION_STAFF_HEADER, session.staffId);
  requestHeaders.set(SESSION_ROLE_HEADER, session.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/api/:path*",
};
