"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "../shell";
import { displayTitle } from "@/lib/fields";
import { formatWhen, kindLabel, toDatetimeLocalValue } from "@/lib/followup-labels";

export default function SeguimientoApp({ user }) {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("contacto") || "";
  const [types, setTypes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [latest, setLatest] = useState({});
  const [typeId, setTypeId] = useState("all");
  const [search, setSearch] = useState("");
  const [contactId, setContactId] = useState(initialId);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    kind: "respuesta",
    body: "",
    occurred_at: toDatetimeLocalValue(),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadLists() {
    const [typesRes, contactsRes, latestRes] = await Promise.all([
      fetch("/api/types"),
      fetch("/api/contacts"),
      fetch("/api/followups/latest"),
    ]);
    const typesData = await typesRes.json();
    const contactsData = await contactsRes.json();
    const latestData = await latestRes.json();
    setTypes(typesData.types || []);
    setContacts(contactsData.contacts || []);
    setLatest(latestData.latest || {});
  }

  async function loadTimeline(id) {
    if (!id) {
      setEvents([]);
      return;
    }
    const response = await fetch(`/api/contacts/${id}/followups`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "No se pudo cargar el historial.");
      return;
    }
    setEvents(data.events || []);
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (initialId) setContactId(initialId);
  }, [initialId]);

  useEffect(() => {
    loadTimeline(contactId);
  }, [contactId]);

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

  const current = contacts.find((contact) => String(contact.id) === String(contactId));

  async function addRecord(event) {
    event.preventDefault();
    if (!contactId) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/contacts/${contactId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setForm({ kind: "respuesta", body: "", occurred_at: toDatetimeLocalValue() });
    await Promise.all([loadTimeline(contactId), loadLists()]);
  }

  async function removeRecord(followupId) {
    if (!window.confirm("¿Borrar este registro?")) return;
    await fetch(`/api/followups/${followupId}`, { method: "DELETE" });
    await Promise.all([loadTimeline(contactId), loadLists()]);
  }

  return (
    <Shell user={user}>
      <header className="topbar">
        <div>
          <h1>Seguimiento</h1>
          <p className="subtitle">Anota qué respondió cada contacto y cuándo, para no perder el hilo.</p>
        </div>
      </header>

      <div className="layout">
        <section className="panel sticky">
          <h2>Contactos</h2>
          <label>Tipo</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="all">Todos</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <label>Buscar</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o teléfono" />
          <div className="list" style={{ marginTop: 16 }}>
            {!listed.length && <div className="empty">No hay contactos.</div>}
            {listed.map((contact) => {
              const last = latest[contact.id];
              const active = String(contact.id) === String(contactId);
              return (
                <button
                  key={contact.id}
                  type="button"
                  className={`card pick-card ${active ? "picked" : ""}`}
                  onClick={() => setContactId(String(contact.id))}
                >
                  <h3 className="conjunto">{displayTitle(contact)}</h3>
                  <p className="meta">
                    {contact.type_name ? `${contact.type_name} · ` : ""}
                    {contact.nombre}
                  </p>
                  {last ? (
                    <p className="meta">{kindLabel(last.kind)} · {formatWhen(last.occurred_at)}</p>
                  ) : (
                    <p className="meta">Sin registros</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          {!current ? (
            <div className="empty">Elige un contacto para ver su bitácora.</div>
          ) : (
            <>
              <h2>{displayTitle(current)}</h2>
              <p className="hint">
                {current.nombre} · <span className="phone">+57 {current.telefono}</span>
                {current.type_name ? ` · ${current.type_name}` : ""}
              </p>

              <form onSubmit={addRecord}>
                <label>Tipo</label>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="respuesta">Respondió</option>
                  <option value="nota">Nota</option>
                  <option value="llamada">Llamada</option>
                </select>
                <label>Fecha</label>
                <input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
                />
                <label>Qué pasó</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Ej. Dijo que revisa con administración y llama mañana."
                  required
                />
                {error && <p className="error-text">{error}</p>}
                <div className="actions" style={{ marginTop: 16 }}>
                  <button className="btn-primary" type="submit" disabled={saving}>
                    {saving ? "Guardando…" : "Guardar registro"}
                  </button>
                </div>
              </form>

              <h2 style={{ marginTop: 28 }}>Historial</h2>
              <div className="timeline">
                {!events.length && <p className="hint">Todavía no hay movimientos.</p>}
                {events.map((eventItem) => (
                  <article key={eventItem.id} className="timeline-item">
                    <div className="card-head">
                      <div>
                        <span className={`badge ${eventItem.kind === "enviado" ? "sent" : "pending"}`}>
                          {kindLabel(eventItem.kind)}
                        </span>
                        <p className="meta">{formatWhen(eventItem.occurred_at)}</p>
                      </div>
                      {eventItem.canDelete && (
                        <button className="btn-danger btn-small" type="button" onClick={() => removeRecord(eventItem.followupId)}>
                          Borrar
                        </button>
                      )}
                    </div>
                    <p className="preview">{eventItem.body}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
