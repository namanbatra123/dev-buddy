import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 100;

  const userLimit = rateLimitMap.get(ip);
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
  } else if (userLimit.count >= maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  } else {
    userLimit.count++;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
