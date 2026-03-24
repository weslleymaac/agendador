"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Credenciais inválidas. Verifique LOGIN_USERNAME e LOGIN_PASSWORD no .env da raiz.");
        return;
      }
      localStorage.setItem("agendador_user", username.trim());
      window.location.assign("/");
    } catch {
      setError("Não foi possível conectar ao servidor. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "20px" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 24 }}>Login</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Acesso ao painel de agendamentos</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          autoComplete="username"
          disabled={loading}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoComplete="current-password"
          disabled={loading}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
        />
        {error ? <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            padding: "10px 12px",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
