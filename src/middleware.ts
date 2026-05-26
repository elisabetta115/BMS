import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const path = request.nextUrl.pathname;

  // Routes that need to be embeddable in <iframe> within our own app
  // (PDF previews, images). They stay same-origin, so SAMEORIGIN is safe.
  const isEmbeddable =
    path.startsWith("/api/units/") || path.startsWith("/api/images/");

  // Security headers
  response.headers.set("X-Frame-Options", isEmbeddable ? "SAMEORIGIN" : "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Block API auth routes from non-POST methods
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    if (request.method !== "POST" && request.method !== "GET") {
      return new NextResponse(null, { status: 405 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};