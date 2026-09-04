"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Shell from "../shell";
import { composeMessage, displayTitle } from "@/lib/fields";

export default function PanelApp({ user }) {
  const [contacts, setContacts] = useState([]);
  const [types, setTypes] = useState([]);
  const [settings, setSettings] = useState({ delayMs: 4000, template: "" });
  const [status, setStatus] = useState({ authenticated: false });
  const [typeId, setTypeId] = useState("all");
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [sendingIds, setSendingIds] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const cancelRef = useRef(false);

  const currentType = types.find((type) => String(type.id) === String(typeId));

  async function load() {
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
    setContacts(contactsData.contacts || []);
    setTypes(typesData.types || []);
    setSettings(settingsData);
    setStatus(statusData);
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      fetch("/api/ultramsg/status").then((r) => r.json()).then(setStatus);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentType) setTemplate(currentType.template || settings.template || "");
    else setTemplate(settings.template || "");
    setSelected(new Set());
  }, [typeId, types, settings.template]);

  const listed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (typeId !== "all" && String(contact.type_id) !== String(typeId)) return false;
      if (!q) return true;
      const extras = Object.values(contact.extras || {}).join(" ");
      return `${contact.conjunto} ${contact.nombre} ${contact.telefono} ${contact.type_name} ${extras}`
        .toLowerCase()
        .includes(q);
    });
  }, [contacts, typeId, search]);

  const listedIds = listed.map((contact) => contact.id);
  const allListedChecked = listed.length > 0 && listed.every((contact) => selected.has(contact.id));
  const ready = Boolean(status.authenticated);
  const selectedListed = listed.filter((contact) => selected.has(contact.id));

  function templateFor(contact) {
    if (currentType) return template;
    const type = types.find((item) => item.id === contact.type_id);
    return type?.template || settings.template || "";
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllListed() {
    if (allListedChecked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(listedIds));
  }

  async function saveTemplate() {
    if (!currentType) return;
    setSaved("");
    const response = await fetch(`/api/types/${currentType.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: currentType.name,
        template,
        fields: currentType.fields,
      }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setSaved("Plantilla guardada.");
    await load();
  }

  async function sendOne(contact) {
    setSendingIds((ids) => [...ids, contact.id]);
    const response = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contact.id,
        template: currentType ? template : undefined,
      }),
    });
    const data = await response.json();
    setSendingIds((ids) => ids.filter((id) => id !== contact.id));
    if (!response.ok) setError(data.error || "No se pudo enviar.");
    await load();
    return response.ok;
  }

  async function sendQueue(queue, label) {
    if (!queue.length) return;
    if (!window.confirm(`Se enviarán ${queue.length} mensajes (${label}). ¿Continuar?`)) return;
    setBulkRunning(true);
    cancelRef.current = false;
    setError("");
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < queue.length; i += 1) {
      if (cancelRef.current) break;
      const contact = queue[i];
      setBulkText(`Enviando ${i + 1} de ${queue.length}: ${contact.saludo || contact.nombre}`);
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

  const tokens = ["{nombre}", "{usuario}", ...((currentType?.fields || []).map((field) => `{${field.field_key}}`))];

  return (
    <Shell user={user}>
      <header className="topbar">
        <div>
          <h1>Panel de envíos</h1>
          <p className="subtitle">Filtra por tipo, ajusta la plantilla y elige a quién escribir.</p>
        </div>
        <aside className={`status-card ${ready ? "connected" : "disconnected"}`}>
          <div className="status-dot" />
          <div>
            <div className="progress-label">UltraMsg</div>
            <div className="status-text">
              {ready ? "Conectado" : status.configured === false ? "Sin claves" : status.status || "Desconectado"}
            </div>
          </div>
        </aside>
      </header>

      <div className="layout">
        <section className="panel sticky">
          <h2>Lista</h2>
          <label>Tipo</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="all">Todos los tipos</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <p className="hint" style={{ marginTop: 12 }}>
            {listed.length} contactos en esta lista.{" "}
            <Link href="/contactos">Agregar contactos</Link>
          </p>

          {currentType ? (
            <>
              <label>Plantilla de {currentType.name}</label>
              <textarea value={template} onChange={(e) => setTemplate(e.target.value)} />
              <div className="tokens">
                {tokens.map((token) => (
                  <button key={token} className="token" type="button" onClick={() => setTemplate((prev) => `${prev}${token}`)}>
                    {token}
                  </button>
                ))}
              </div>
              <button className="btn-primary" type="button" onClick={saveTemplate}>Guardar plantilla</button>
              {saved && <p className="hint" style={{ marginTop: 10 }}>{saved}</p>}
            </>
          ) : (
            <p className="hint">Elige un tipo para editar su plantilla. Si envías “todos”, cada contacto usa la plantilla de su tipo.</p>
          )}

          {error && <p className="error-text">{error}</p>}
        </section>

        <section>
          <div className="toolbar">
            <input type="search" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="check-all">
              <input type="checkbox" checked={allListedChecked} onChange={toggleAllListed} />
              Todos los listados
            </label>
            <button
              className="btn-whatsapp"
              type="button"
              disabled={!ready || bulkRunning || !selectedListed.length}
              onClick={() => sendQueue(selectedListed, "seleccionados")}
            >
              Enviar seleccionados ({selectedListed.length})
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!ready || bulkRunning || !listed.length}
              onClick={() => sendQueue(listed, "todos los listados")}
            >
              Enviar listados ({listed.length})
            </button>
            {bulkRunning && (
              <button className="btn-ghost" type="button" onClick={() => { cancelRef.current = true; }}>Detener</button>
            )}
          </div>
          {bulkText && <p className="bulk-status">{bulkText}</p>}
          <div className="list">
            {!listed.length && <div className="empty">No hay contactos con este filtro.</div>}
            {listed.map((contact) => {
              const sending = sendingIds.includes(contact.id);
              const checked = selected.has(contact.id);
              const preview = composeMessage(templateFor(contact), contact, user.name);
              return (
                <article key={contact.id} className={`card ${contact.sent ? "sent" : ""} ${sending ? "sending" : ""} ${checked ? "picked" : ""}`}>
                  <label className="card-head pick">
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(contact.id)} />
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
                  </label>
                  <p className="preview">{preview}</p>
                  {contact.last_error && !contact.sent && <p className="error-text">{contact.last_error}</p>}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
