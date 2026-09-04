"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "../shell";

function compose(template, contact, userName) {
  return (template || "")
    .replaceAll("{nombre}", contact.saludo || contact.nombre)
    .replaceAll("{conjunto}", contact.conjunto)
    .replaceAll("{usuario}", userName || "")
    .trim();
}

export default function PanelApp({ user }) {
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({ template: "", delayMs: 4000 });
  const [status, setStatus] = useState({ authenticated: false, status: "…" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ conjunto: "", nombre: "", saludo: "", telefono: "" });
  const [sendingIds, setSendingIds] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState("");
  const cancelRef = useRef(false);

  async function loadAll() {
    const [contactsRes, settingsRes, statusRes] = await Promise.all([
      fetch("/api/contacts"),
      fetch("/api/settings"),
      fetch("/api/ultramsg/status"),
    ]);
    const contactsData = await contactsRes.json();
    const settingsData = await settingsRes.json();
    const statusData = await statusRes.json();
    setContacts(contactsData.contacts || []);
    setSettings(settingsData);
    setStatus(statusData);
  }

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      fetch("/api/ultramsg/status").then((r) => r.json()).then(setStatus);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const pending = contacts.filter((c) => !c.sent);
  const sentCount = contacts.filter((c) => c.sent).length;
  const ready = Boolean(status.authenticated);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filter === "pending" && c.sent) return false;
      if (filter === "sent" && !c.sent) return false;
      if (!q) return true;
      return `${c.conjunto} ${c.nombre} ${c.telefono}`.toLowerCase().includes(q);
    });
  }, [contacts, filter, search]);

  async function addContact(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setForm({ conjunto: "", nombre: "", saludo: "", telefono: "" });
    await loadAll();
  }

  async function importSeed() {
    if (!window.confirm("¿Cargar la lista inicial de conjuntos Cootravir PH en tu cuenta?")) return;
    await fetch("/api/contacts/import", { method: "POST" });
    await loadAll();
  }

  async function removeContact(id) {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function toggleSent(contact) {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sent: !contact.sent }),
    });
    await loadAll();
  }

  async function sendOne(contact) {
    setSendingIds((ids) => [...ids, contact.id]);
    const response = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id }),
    });
    const data = await response.json();
    setSendingIds((ids) => ids.filter((id) => id !== contact.id));
    if (!response.ok) setError(data.error || "No se pudo enviar.");
    await loadAll();
    return response.ok;
  }

  async function sendPending() {
    const queue = contacts.filter((c) => !c.sent);
    if (!queue.length) return;
    if (!window.confirm(`Se enviarán ${queue.length} mensajes con ${(settings.delayMs || 4000) / 1000}s entre cada uno. ¿Continuar?`)) {
      return;
    }
    setBulkRunning(true);
    cancelRef.current = false;
    setError("");
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < queue.length; i += 1) {
      if (cancelRef.current) break;
      const contact = queue[i];
      setBulkText(`Enviando ${i + 1} de ${queue.length}: ${contact.saludo}`);
      const ok = await sendOne(contact);
      if (ok) sent += 1;
      else failed += 1;
      if (i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, settings.delayMs || 4000));
      }
    }
    setBulkRunning(false);
    setBulkText(`Listo. Enviados: ${sent}. Fallidos: ${failed}.`);
  }

  return (
    <Shell user={user}>
      <header className="topbar">
        <div>
          <h1>Panel de envíos</h1>
          <p className="subtitle">Tus contactos y tu cuenta de UltraMsg. Nadie más ve esta lista.</p>
        </div>
        <div className="header-side">
          <aside className={`status-card ${ready ? "connected" : "disconnected"}`}>
            <div className="status-dot" />
            <div>
              <div className="progress-label">UltraMsg</div>
              <div className="status-text">
                {ready ? `Conectado · ${status.instanceId}` : status.configured === false ? "Sin claves" : status.status || "Desconectado"}
              </div>
            </div>
          </aside>
          <aside className="progress-card">
            <div className="progress-label">Enviados</div>
            <div className="progress-number">{sentCount} / {contacts.length || 0}</div>
            <div className="progress-bar">
              <span style={{ width: contacts.length ? `${(sentCount / contacts.length) * 100}%` : "0%" }} />
            </div>
          </aside>
        </div>
      </header>

      <div className="layout">
        <section className="panel sticky">
          <h2>Nuevo contacto</h2>
          <p className="hint">Registra encargado, conjunto y teléfono. El saludo se usa en el WhatsApp.</p>
          <form onSubmit={addContact}>
            <label>Conjunto / edificio</label>
            <input value={form.conjunto} onChange={(e) => setForm({ ...form, conjunto: e.target.value })} required />
            <label>Nombre completo</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <label>Saludo</label>
            <input value={form.saludo} onChange={(e) => setForm({ ...form, saludo: e.target.value })} placeholder="Ej. Luisa Fernanda" />
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="3101234567" required />
            {error && <p className="error-text">{error}</p>}
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" type="submit">Guardar contacto</button>
              <button className="btn-ghost" type="button" onClick={importSeed}>Cargar lista Cootravir</button>
            </div>
          </form>
        </section>

        <section>
          <div className="toolbar">
            <input type="search" placeholder="Buscar conjunto, nombre o teléfono" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="sent">Enviados</option>
            </select>
            <button className="btn-whatsapp" type="button" onClick={sendPending} disabled={!ready || bulkRunning || !pending.length}>
              Enviar pendientes ({pending.length})
            </button>
            {bulkRunning && (
              <button className="btn-ghost" type="button" onClick={() => { cancelRef.current = true; }}>Detener</button>
            )}
          </div>
          {bulkText && <p className="bulk-status">{bulkText}</p>}
          <div className="list">
            {!visible.length && <div className="empty">Aún no hay contactos en tu cuenta.</div>}
            {visible.map((contact) => {
              const sending = sendingIds.includes(contact.id);
              const message = compose(settings.template, contact, user.name);
              return (
                <article key={contact.id} className={`card ${contact.sent ? "sent" : ""} ${sending ? "sending" : ""} ${contact.last_error && !contact.sent ? "error" : ""}`}>
                  <div className="card-head">
                    <div>
                      <h3 className="conjunto">{contact.conjunto}</h3>
                      <p className="meta">{contact.nombre} · <span className="phone">+57 {contact.telefono}</span></p>
                    </div>
                    <span className={`badge ${contact.sent ? "sent" : "pending"}`}>
                      {sending ? "Enviando" : contact.sent ? "Enviado" : "Pendiente"}
                    </span>
                  </div>
                  <p className="preview">{message}</p>
                  {contact.last_error && !contact.sent && <p className="error-text">{contact.last_error}</p>}
                  <div className="card-actions">
                    <button className="btn-whatsapp btn-small" type="button" disabled={!ready || sending || contact.sent || bulkRunning} onClick={() => sendOne(contact)}>
                      Enviar WhatsApp
                    </button>
                    <button className="btn-ghost btn-small" type="button" onClick={() => toggleSent(contact)}>
                      {contact.sent ? "Marcar pendiente" : "Marcar enviado"}
                    </button>
                    <button className="btn-danger btn-small" type="button" onClick={() => removeContact(contact.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
