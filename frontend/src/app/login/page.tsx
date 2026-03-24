"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const ok = login(username.trim(), password);
    if (!ok) {
      setError("Credenciais inválidas. Use Admin / admin.");
      return;
    }
    router.push("/");
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
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoComplete="current-password"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}
        />
        {error ? <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p> : null}
        <button
          type="submit"
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
