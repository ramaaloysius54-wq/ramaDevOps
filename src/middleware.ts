import { NextResponse } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-development-key-change-it"
);

const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("rama_auth_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Token tidak ditemukan." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.userId));
    requestHeaders.set("x-user-role", String(payload.role));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Token kadaluwarsa atau tidak valid." },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("rama_auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
