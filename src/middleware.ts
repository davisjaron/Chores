import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const publicPaths = ["/login", "/register"];
    if (!token && !publicPaths.includes(path)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (!token) {
      return NextResponse.next();
    }

    if (token.role === "kid") {
      const parentOnly = ["/children", "/chores", "/settings", "/register"];
      if (parentOnly.some((p) => path.startsWith(p))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/login") || path.startsWith("/register")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/register|api/children/login-list|api/theme|_next/static|_next/image|favicon.ico).*)",
  ],
};
