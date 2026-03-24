const AUTH_COOKIE = "agendador_auth";
const AUTH_VALUE = "ok";

/** Apenas para checagens locais; a sessão real é cookie HttpOnly definido em `/api/login`. */
export function isAuthenticatedClient(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.includes(`${AUTH_COOKIE}=${AUTH_VALUE}`);
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("agendador_user");
    window.location.href = "/login";
  }
}
