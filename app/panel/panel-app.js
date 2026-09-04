"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "../shell";
import { composeMessage, displayTitle } from "@/lib/fields";

function emptyExtras(fields) {
  const extras = {};
  for (const field of fields || []) extras[field.field_key] = "";
  return extras;
}

export default function PanelApp({ user }) {
  const [contacts, setContacts] = useState([]);
  const [types, setTypes] = useState([]);
  const [settings, setSettings] = useState({ template: "", delayMs: 4000 });
  const [status, setStatus] = useState({ authenticated: false, status: "…" });
  const [search, setSearch] = useState("");
  const [sentFilter, setSentFilter] = useState("all");
  const [typeId, setTypeId] = useState("");
  const [form, setForm] = useState({ nombre: "", saludo: "", telefono: "", extras: {} });
  const [newTypeName, setNewTypeName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeTemplate, setTypeTemplate] = useState("");
  const [sendingIds, setSendingIds] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState("");
  const cancelRef = useRef(false);

  const selected = types.find((type) => String(type.id) === String(typeId));

  async function loadAll(preferredTypeId) {
    const [contactsRes, typesRes, settingsRes, statusRes] = await Promise.all([
      fetch("/api/contacts"),
      fetch("/api/types"),
      fetch("/api/settings"),
      fetch("/api/ultramsg/status"),
    ]);
    const contactsData = await contactsRes.json();
    const typesData = await typesRes.json();
    const settingsData = await settingsRes.json();
    const statusData = await statusRes.json();
    const nextTypes = typesData.types || [];
    setContacts(contactsData.contacts || []);
    setTypes(nextTypes);
    setSettings(settingsData);
    setStatus(statusData);
    const nextId = preferredTypeId || typeId || nextTypes[0]?.id;
    if (nextId) {
      setTypeId(String(nextId));
      const type = nextTypes.find((item) => String(item.id) === String(nextId)) || nextTypes[0];
      if (type) {
        setTypeName(type.name);
        setTypeTemplate(type.template || settingsData.template || "");
        setForm((prev) => ({
          ...prev,
          extras: { ...emptyExtras(type.fields), ...(prev.extras || {}) },
        }));
      }
    }
  }

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      fetch("/api/ultramsg/status").then((r) => r.json()).then(setStatus);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTypeName(selected.name);
    setTypeTemplate(selected.template || settings.template || "");
    setForm((prev) => ({ ...prev, extras: emptyExtras(selected.fields) }));
  }, [typeId]);

  const ofType = contacts.filter((contact) => String(contact.type_id) === String(typeId));
  const pending = ofType.filter((contact) => !contact.sent);
  const sentCount = ofType.filter((contact) => contact.sent).length;
  const ready = Boolean(status.authenticated);
  const template = selected?.template || settings.template;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ofType.filter((contact) => {
      if (sentFilter === "pending" && contact.sent) return false;
      if (sentFilter === "sent" && !contact.sent) return false;
      if (!q) return true;
      const extras = Object.values(contact.extras || {}).join(" ");
      return `${contact.conjunto} ${contact.nombre} ${contact.telefono} ${extras}`.toLowerCase().includes(q);
    });
  }, [ofType, sentFilter, search]);

  async function saveType() {
    if (!selected) return;
    const fields = [...(selected.fields || [])];
    if (newFieldLabel.trim()) {
      fields.push({ label: newFieldLabel.trim() });
    }
    const response = await fetch(`/api/types/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typeName, template: typeTemplate, fields }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setNewFieldLabel("");
    await loadAll(selected.id);
  }

  async function removeField(fieldKey) {
    if (!selected) return;
    const fields = (selected.fields || []).filter((field) => field.field_key !== fieldKey);
    await fetch(`/api/types/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: typeName, template: typeTemplate, fields }),
    });
    await loadAll(selected.id);
  }

  async function createType(event) {
    event.preventDefault();
    if (!newTypeName.trim()) return;
    const response = await fetch("/api/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName.trim(), template: typeTemplate, fields: [] }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setNewTypeName("");
    await loadAll(data.id);
  }

  async function deleteType() {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el tipo “${selected.name}”? Los contactos no se borran.`)) return;
    await fetch(`/api/types/${selected.id}`, { method: "DELETE" });
    setTypeId("");
    await loadAll();
  }

  async function addContact(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, typeId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setForm({ nombre: "", saludo: "", telefono: "", extras: emptyExtras(selected?.fields) });
    await loadAll(typeId);
  }

  async function importSeed() {
    if (!window.confirm("¿Cargar la lista Cootravir PH en el tipo Unidades PH?")) return;
    await fetch("/api/contacts/import", { method: "POST" });
    await loadAll();
  }

  async function removeContact(id) {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await loadAll(typeId);
  }

  async function toggleSent(contact) {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sent: !contact.sent }),
    });
    await loadAll(typeId);
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
    await loadAll(typeId);
    return response.ok;
  }

  async function sendPending() {
    const queue = pending;
    if (!queue.length) return;
    if (!window.confirm(`Se enviarán ${queue.length} mensajes del tipo “${selected?.name}”. ¿Continuar?`)) return;
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

  function insertToken(token) {
    setTypeTemplate((prev) => `${prev}${token}`);
  }

  return (
    <Shell user={user}>
      <header className="topbar">
        <div>
          <h1>Panel de envíos</h1>
          <p className="subtitle">Separa contactos por tipo, con variables propias y envío masivo de ese tipo.</p>
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
            <div className="progress-label">Enviados de este tipo</div>
            <div className="progress-number">{sentCount} / {ofType.length || 0}</div>
            <div className="progress-bar">
              <span style={{ width: ofType.length ? `${(sentCount / ofType.length) * 100}%` : "0%" }} />
            </div>
          </aside>
        </div>
      </header>

      <div className="layout">
        <section className="panel sticky">
          <h2>Tipo</h2>
          <p className="hint">Cada tipo tiene sus variables y su plantilla de WhatsApp.</p>
          <label>Tipo activo</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          <form onSubmit={createType} className="add-field-row">
            <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nuevo tipo, ej. Proveedores" />
            <button className="btn-ghost btn-small" type="submit">Crear</button>
          </form>

          {selected && (
            <>
              <label>Nombre del tipo</label>
              <input value={typeName} onChange={(e) => setTypeName(e.target.value)} />

              <label>Variables de este tipo</label>
              <div className="field-list">
                {(selected.fields || []).map((field) => (
                  <div key={field.field_key} className="field-chip">
                    <span>{field.label} <code>{"{" + field.field_key + "}"}</code></span>
                    <button type="button" className="btn-ghost btn-small" onClick={() => removeField(field.field_key)}>Quitar</button>
                  </div>
                ))}
              </div>
              <div className="add-field-row">
                <input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Nueva variable, ej. Cargo" />
                <button className="btn-ghost btn-small" type="button" onClick={saveType}>Agregar</button>
              </div>

              <label>Plantilla de este tipo</label>
              <textarea value={typeTemplate} onChange={(e) => setTypeTemplate(e.target.value)} />
              <div className="tokens">
                {["{nombre}", "{usuario}", ...(selected.fields || []).map((field) => `{${field.field_key}}`)].map((token) => (
                  <button key={token} className="token" type="button" onClick={() => insertToken(token)}>{token}</button>
                ))}
              </div>
              <div className="actions">
                <button className="btn-primary" type="button" onClick={saveType}>Guardar tipo</button>
                {types.length > 1 && (
                  <button className="btn-danger btn-small" type="button" onClick={deleteType}>Eliminar tipo</button>
                )}
              </div>
            </>
          )}

          <hr className="split" />
          <h2>Nuevo contacto</h2>
          <p className="hint">Los campos extra cambian según el tipo elegido arriba.</p>
          <form onSubmit={addContact}>
            {(selected?.fields || []).map((field) => (
              <div key={field.field_key}>
                <label>{field.label}</label>
                <input
                  value={form.extras?.[field.field_key] || ""}
                  onChange={(e) => setForm({
                    ...form,
                    extras: { ...form.extras, [field.field_key]: e.target.value },
                  })}
                />
              </div>
            ))}
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
            <input type="search" placeholder="Buscar en este tipo" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={sentFilter} onChange={(e) => setSentFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="sent">Enviados</option>
            </select>
            <button className="btn-whatsapp" type="button" onClick={sendPending} disabled={!ready || bulkRunning || !pending.length}>
              Enviar {selected?.name || "tipo"} ({pending.length})
            </button>
            {bulkRunning && (
              <button className="btn-ghost" type="button" onClick={() => { cancelRef.current = true; }}>Detener</button>
            )}
          </div>
          {bulkText && <p className="bulk-status">{bulkText}</p>}
          <div className="list">
            {!visible.length && <div className="empty">No hay contactos en este tipo.</div>}
            {visible.map((contact) => {
              const sending = sendingIds.includes(contact.id);
              const message = composeMessage(template, contact, user.name);
              return (
                <article key={contact.id} className={`card ${contact.sent ? "sent" : ""} ${sending ? "sending" : ""} ${contact.last_error && !contact.sent ? "error" : ""}`}>
                  <div className="card-head">
                    <div>
                      <h3 className="conjunto">{displayTitle(contact)}</h3>
                      <p className="meta">
                        {contact.type_name ? `${contact.type_name} · ` : ""}
                        {contact.nombre} · <span className="phone">+57 {contact.telefono}</span>
                      </p>
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
