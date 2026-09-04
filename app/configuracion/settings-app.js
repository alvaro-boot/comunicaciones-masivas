"use client";

import { useEffect, useState } from "react";
import Shell from "../shell";

export default function SettingsApp({ user }) {
  const [form, setForm] = useState({
    instance: "",
    token: "",
    template: "",
    delayMs: 4000,
    hasToken: false,
  });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [settingsRes, statusRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/ultramsg/status"),
    ]);
    const settings = await settingsRes.json();
    const statusData = await statusRes.json();
    setForm({
      instance: settings.instance || "",
      token: "",
      template: settings.template || "",
      delayMs: settings.delayMs || 4000,
      hasToken: settings.hasToken,
    });
    setStatus(statusData);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setMessage("Configuración guardada.");
    setForm((prev) => ({ ...prev, token: "" }));
    await load();
  }

  function insertToken(token) {
    setForm((prev) => ({ ...prev, template: `${prev.template}${token}` }));
  }

  const ready = Boolean(status?.authenticated);

  return (
    <Shell user={user}>
      <h1>Configuración</h1>
      <p className="subtitle">Tus claves de UltraMsg quedan ligadas solo a tu usuario.</p>

      <div className="layout" style={{ marginTop: 24 }}>
        <section className="panel">
          <h2>UltraMsg</h2>
          <aside className={`status-card ${ready ? "connected" : "disconnected"}`} style={{ marginBottom: 16 }}>
            <div className="status-dot" />
            <div>
              <div className="progress-label">Estado</div>
              <div className="status-text">
                {ready ? "WhatsApp vinculado" : status?.configured === false ? "Faltan claves" : status?.status || "Sin vincular"}
              </div>
            </div>
          </aside>
          <form onSubmit={save}>
            <label>Instance ID</label>
            <input
              value={form.instance}
              onChange={(e) => setForm({ ...form, instance: e.target.value })}
              placeholder="instance176484"
            />
            <label>Token {form.hasToken ? "(ya hay uno guardado; escribe otro para cambiarlo)" : ""}</label>
            <input
              type="password"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              placeholder="Token de UltraMsg"
            />
            <label>Espera entre envíos (ms)</label>
            <input
              type="number"
              min="2000"
              value={form.delayMs}
              onChange={(e) => setForm({ ...form, delayMs: Number(e.target.value) })}
            />
            <label>Plantilla del mensaje</label>
            <textarea
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
            />
            <div className="tokens">
              {["{nombre}", "{conjunto}", "{usuario}"].map((token) => (
                <button key={token} className="token" type="button" onClick={() => insertToken(token)}>
                  {token}
                </button>
              ))}
            </div>
            {error && <p className="error-text">{error}</p>}
            {message && <p className="hint">{message}</p>}
            <div className="actions">
              <button className="btn-primary" type="submit">Guardar</button>
            </div>
          </form>
        </section>
        {!ready && form.hasToken && (
          <section className="panel">
            <h2>Vincular WhatsApp</h2>
            <p className="hint">Escanea este QR desde WhatsApp en el teléfono de tu instancia UltraMsg.</p>
            <img alt="QR UltraMsg" src={`/api/ultramsg/qr?t=${Date.now()}`} style={{ maxWidth: 240, borderRadius: 12 }} />
          </section>
        )}
      </div>
    </Shell>
  );
}
