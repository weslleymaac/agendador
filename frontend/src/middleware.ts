import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Rotas visíveis sem cookie de login (documentação pública). */
const PUBLIC_PATHS = new Set<string>(["/docs"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

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
