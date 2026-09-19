import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require specific roles (if not listed, all authenticated users can access)
const roleRequiredRoutes: Record<string, string[]> = {
  "/settings": ["ADMIN"],
  "/employees": ["ADMIN", "MANAGER"],
  "/projects": ["ADMIN", "MANAGER"],
  "/leads": ["ADMIN", "MANAGER"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invites/token") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    pathname === "/manifest.json";

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Verify JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → redirect to team login
  if (!token) {
    const loginUrl = new URL("/login/team", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based guard — check if the route requires specific roles
  const role = token.role as string | undefined;
  if (role) {
    for (const [route, allowedRoles] of Object.entries(roleRequiredRoutes)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        if (!allowedRoles.includes(role)) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        break;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
