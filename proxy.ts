import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Base64 decoding helper
function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

// Decode JWT payload
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadStr = atob(base64);
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

// Verify JWT signature and expiration
async function verifyJwt(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(`${header}.${payload}`);

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    );

    const signatureBin = base64UrlDecode(signature);
    const isSignatureValid = await crypto.subtle.verify("HMAC", key, signatureBin as any, data);
    if (!isSignatureValid) return false;

    // Check expiration
    const payloadData = decodeJwtPayload(token);
    if (payloadData && payloadData.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payloadData.exp < now) {
        return false; // Token expired
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve token from cookies or Authorization header
  let token = request.cookies.get("accessToken")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // Verify token validity
  let isValid = false;
  let payload: any = null;
  if (token) {
    const secret = process.env.JWT_ACCESS_SECRET || "default_secret";
    isValid = await verifyJwt(token, secret);
    if (isValid) {
      payload = decodeJwtPayload(token);
    }
  }

  // 1. Handle API routes
  if (pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    if (isValid && payload) {
      requestHeaders.set("x-user-id", payload.id);
      requestHeaders.set("x-user-email", payload.email || "");
      requestHeaders.set("x-user-username", payload.username || "");
      requestHeaders.set("x-user-verified", String(payload.email_verified || payload.is_verified || false));
      if (payload.role) requestHeaders.set("x-user-role", payload.role);
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Define auth page routes (publicly accessible only when logged out)
  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If user is logged in (valid token exists)
  if (isValid && payload) {
    // If they try to access login, register, forgot-password, reset-password, or home page, redirect to dashboard
    if (isAuthRoute || pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else {
    // If user is NOT logged in and tries to access private routes
    if (!isAuthRoute && pathname !== "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo/images if any (we exclude files with extensions to allow assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
export default proxy;
