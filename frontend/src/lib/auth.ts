const AUTH_COOKIE = "agendador_auth";
const AUTH_VALUE = "ok";

export function isAuthenticatedClient(): boolean {
  if (typeof window === "undefined") return false;
  return document.cookie.includes(`${AUTH_COOKIE}=${AUTH_VALUE}`);
}

export function login(username: string, password: string): boolean {
  const valid = username === "Admin" && password === "admin";
  if (!valid) return false;

  document.cookie = `${AUTH_COOKIE}=${AUTH_VALUE}; path=/; max-age=28800; samesite=lax`;
  localStorage.setItem("agendador_user", username);
  return true;
}

export function logout(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`;
  localStorage.removeItem("agendador_user");
}
