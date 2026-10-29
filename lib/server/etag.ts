import { createHash } from "crypto";
import { NextResponse } from "next/server";

// Every GET here is polled (see lib/hooks/swrConfig.ts), and most polls find
// nothing changed. Tagging the body with a content hash lets the browser
// revalidate with If-None-Match automatically — `no-cache` means "always ask
// first", not "don't store" — and an unchanged poll gets an empty 304
// instead of re-downloading the whole list, which is what Vercel bills as
// Fast Origin/Data Transfer. `private` keeps the CDN from sharing it.
export function jsonWithEtag(request: Request, data: unknown) {
  const body = JSON.stringify(data);
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };

  // The CDN may weaken the tag (W/"…") when it compresses the response.
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch?.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag)) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(body, { headers: { ...headers, "Content-Type": "application/json" } });
}
