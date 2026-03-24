import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuth = req.cookies.get("agendador_auth")?.value === "ok";

  if (pathname === "/login" && isAuth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname !== "/login" && !isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/docs", "/login"],
};
