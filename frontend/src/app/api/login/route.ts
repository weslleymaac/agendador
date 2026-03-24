import { NextResponse } from "next/server";
import { getLoginCredentials } from "@/lib/root-env";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const u = String(o.username ?? "").trim();
  const p = String(o.password ?? "").trim();
  const { username, password } = getLoginCredentials();

  if (u !== username || p !== password) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("agendador_auth", "ok", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: isProd,
  });
  return res;
}
