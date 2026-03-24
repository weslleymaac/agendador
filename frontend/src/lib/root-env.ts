import fs from "fs";
import path from "path";

/** Caminho do `.env` na raiz do monorepo (pasta acima de `frontend/`). */
export function getRootEnvPath(): string {
  return path.resolve(process.cwd(), "..", ".env");
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Credenciais do painel: variáveis de ambiente do servidor (ex.: Vercel) têm prioridade sobre o `.env` da raiz. */
export function getLoginCredentials(): { username: string; password: string } {
  const file = parseEnvFile(getRootEnvPath());
  const username = (
    process.env.LOGIN_USERNAME ||
    process.env.NEXT_PUBLIC_LOGIN_USERNAME ||
    file.LOGIN_USERNAME ||
    file.NEXT_PUBLIC_LOGIN_USERNAME ||
    "Admin"
  ).trim();
  const password = (
    process.env.LOGIN_PASSWORD ||
    process.env.NEXT_PUBLIC_LOGIN_PASSWORD ||
    file.LOGIN_PASSWORD ||
    file.NEXT_PUBLIC_LOGIN_PASSWORD ||
    "admin"
  ).trim();
  return { username, password };
}

export function getPublicApiBaseUrl(): string {
  const file = parseEnvFile(getRootEnvPath());
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    file.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000"
  ).trim();
}
