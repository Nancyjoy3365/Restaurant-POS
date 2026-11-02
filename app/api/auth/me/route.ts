import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/server/session";

// Who this device is logged in as, according to the server's session —
// the proxy has already rejected the request if there isn't a valid one.
export async function GET(request: Request) {
  return NextResponse.json(sessionFromRequest(request));
}
