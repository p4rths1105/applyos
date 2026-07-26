import { NextRequest, NextResponse } from "next/server";

// "Remember me" without accounts:
// - Visiting your workspace (/<token>) drops a cookie with that token.
// - Coming back to / auto-redirects you to your saved workspace.
// - /?new=1 forces the fresh-start landing (create a new workspace).
const TOKEN_RE = /^\/([0-9A-Za-z]{20,})$/;
const COOKIE = "applyos_token";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // On a workspace URL: remember this token.
  const m = pathname.match(TOKEN_RE);
  if (m) {
    const res = NextResponse.next();
    res.cookies.set(COOKIE, m[1], {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
    return res;
  }

  // On the landing: send returning users back to their workspace.
  if (pathname === "/" && searchParams.get("new") == null) {
    const token = req.cookies.get(COOKIE)?.value;
    if (token) {
      return NextResponse.redirect(new URL(`/${token}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and API internals.
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)"],
};
