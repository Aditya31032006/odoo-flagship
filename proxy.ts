import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadStr = atob(base64);
    return JSON.parse(payloadStr);
  } catch (e) {
    return null;
  }
}

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
  } catch (e) {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  // Only intercept API endpoints to keep pages working normally
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Retrieve token from cookies or Authorization header
  let token = request.cookies.get("accessToken")?.value;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  const requestHeaders = new Headers(request.headers);

  if (token) {
    const secret = process.env.JWT_ACCESS_SECRET || "default_secret";
    const isValid = await verifyJwt(token, secret);
    
    if (isValid) {
      const payload = decodeJwtPayload(token);
      if (payload && payload.id) {
        requestHeaders.set("x-user-id", payload.id);
        requestHeaders.set("x-user-email", payload.email || "");
        requestHeaders.set("x-user-username", payload.username || "");
        requestHeaders.set("x-user-verified", String(payload.is_verified || false));
      }
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/api/:path*",
};
