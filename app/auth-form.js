"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "No se pudo continuar.");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <main className="app auth-wrap">
      <p className="kicker">Prisma Dev</p>
      <h1>{isRegister ? "Crear cuenta" : "Prisma Reach"}</h1>
      <p className="subtitle">
        {isRegister
          ? "Tu espacio de comunicaciones: contactos, tipos y envíos."
          : "Comunicaciones de Prisma Dev. Entra para enviar."}
      </p>
      <form className="panel field-grid" onSubmit={onSubmit}>
        {isRegister && (
          <>
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </>
        )}
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Espera…" : isRegister ? "Registrarme" : "Entrar"}
          </button>
        </div>
      </form>
      <p className="auth-alt">
        {isRegister ? (
          <>
            ¿Ya tienes cuenta? <Link href="/">Entrar</Link>
          </>
        ) : (
          <>
            ¿Nuevo aquí? <Link href="/registro">Crear cuenta</Link>
          </>
        )}
      </p>
    </main>
  );
}
