import { NextResponse, type NextRequest } from "next/server";

const isDevelopment = process.env.NODE_ENV === "development";

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://i.ytimg.com https://lh3.googleusercontent.com https://www.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.pusher.com wss://*.pusher.com https://sockjs-*.pusher.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com",
    "media-src 'self' data: blob: https://assets.mixkit.co",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    isDevelopment ? "" : "upgrade-insecure-requests"
  ]
    .filter(Boolean)
    .join("; ");
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  if (process.env.VERCEL_ENV === "preview") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("Origin-Agent-Cluster", "?1");

  if (!isDevelopment && request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3)$).*)"]
};
