"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Shell({ user, children }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="app">
      <nav className="nav">
        <div>
          <p className="kicker">Cootravir C.T.A</p>
          <strong>{user?.name}</strong>
        </div>
        <div className="nav-links">
          <Link className="btn btn-ghost btn-small" href="/panel">Panel</Link>
          <Link className="btn btn-ghost btn-small" href="/contactos">Contactos</Link>
          <Link className="btn btn-ghost btn-small" href="/configuracion">Configuración</Link>
          <button className="btn-ghost btn-small" type="button" onClick={logout}>Salir</button>
        </div>
      </nav>
      {children}
    </main>
  );
}
