"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "../shell";
import { displayTitle } from "@/lib/fields";

function emptyExtras(fields) {
  const extras = {};
  for (const field of fields || []) extras[field.field_key] = "";
  return extras;
}

export default function ContactosApp({ user }) {
  const [types, setTypes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [typeId, setTypeId] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newField, setNewField] = useState("");
  const [form, setForm] = useState({ nombre: "", saludo: "", telefono: "", extras: {} });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const selected = types.find((type) => String(type.id) === String(typeId));
  const ofType = useMemo(
    () => contacts.filter((contact) => String(contact.type_id) === String(typeId)),
    [contacts, typeId]
  );

  async function load(preferredTypeId) {
    const [typesRes, contactsRes] = await Promise.all([fetch("/api/types"), fetch("/api/contacts")]);
    const typesData = await typesRes.json();
    const contactsData = await contactsRes.json();
    const nextTypes = typesData.types || [];
    setTypes(nextTypes);
    setContacts(contactsData.contacts || []);
    const nextId = preferredTypeId || typeId || nextTypes[0]?.id;
    if (nextId) setTypeId(String(nextId));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setForm((prev) => ({ ...prev, extras: emptyExtras(selected.fields) }));
  }, [typeId]);

  async function createType(event) {
    event.preventDefault();
    if (!newTypeName.trim()) return;
    const response = await fetch("/api/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTypeName.trim(), fields: [] }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setNewTypeName("");
    setError("");
    await load(data.id);
  }

  async function addVariable(event) {
    event.preventDefault();
    if (!selected || !newField.trim()) return;
    const fields = [...(selected.fields || []), { label: newField.trim() }];
    const response = await fetch(`/api/types/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selected.name, template: selected.template, fields }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setNewField("");
    setError("");
    await load(selected.id);
  }

  async function removeVariable(fieldKey) {
    if (!selected) return;
    const fields = (selected.fields || []).filter((field) => field.field_key !== fieldKey);
    await fetch(`/api/types/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selected.name, template: selected.template, fields }),
    });
    await load(selected.id);
  }

  async function deleteType() {
    if (!selected || types.length < 2) return;
    if (!window.confirm(`¿Eliminar el tipo “${selected.name}”?`)) return;
    await fetch(`/api/types/${selected.id}`, { method: "DELETE" });
    setTypeId("");
    await load();
  }

  async function addContact(event) {
    event.preventDefault();
    setError("");
    setOk("");
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, typeId }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    setForm({ nombre: "", saludo: "", telefono: "", extras: emptyExtras(selected?.fields) });
    setOk("Contacto guardado.");
    await load(typeId);
  }

  async function importSeed() {
    if (!window.confirm("¿Cargar la lista Cootravir PH?")) return;
    await fetch("/api/contacts/import", { method: "POST" });
    await load();
  }

  async function removeContact(id) {
    if (!window.confirm("¿Eliminar este contacto?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    await load(typeId);
  }

  return (
    <Shell user={user}>
      <header className="topbar">
        <div>
          <h1>Contactos</h1>
          <p className="subtitle">Tipos, variables y personas. El envío vive en el Panel.</p>
        </div>
      </header>

      <div className="layout">
        <section className="panel">
          <h2>1. Tipo</h2>
          <label>Elige un tipo</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <form onSubmit={createType} className="add-field-row">
            <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Nombre del tipo" />
            <button className="btn-primary btn-small" type="submit">Crear</button>
          </form>
          {types.length > 1 && (
            <button className="btn-danger btn-small" type="button" onClick={deleteType}>Eliminar tipo</button>
          )}

          <h2 style={{ marginTop: 28 }}>2. Variables</h2>
          <p className="hint">Campos extra de este tipo, aparte de nombre y teléfono.</p>
          <div className="field-list">
            {(selected?.fields || []).length === 0 && <p className="hint">Aún no hay variables.</p>}
            {(selected?.fields || []).map((field) => (
              <div key={field.field_key} className="field-chip">
                <span>{field.label}</span>
                <button type="button" className="btn-ghost btn-small" onClick={() => removeVariable(field.field_key)}>Quitar</button>
              </div>
            ))}
          </div>
          <form onSubmit={addVariable} className="add-field-row">
            <input value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="Ej. Conjunto, Cargo, Empresa" />
            <button className="btn-ghost btn-small" type="submit">Agregar</button>
          </form>
        </section>

        <section className="panel">
          <h2>3. Contacto</h2>
          <p className="hint">Se guarda en el tipo “{selected?.name || "…"}”.</p>
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
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <label>Saludo</label>
            <input value={form.saludo} onChange={(e) => setForm({ ...form, saludo: e.target.value })} placeholder="Cómo lo saludas" />
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="3101234567" required />
            {error && <p className="error-text">{error}</p>}
            {ok && <p className="hint">{ok}</p>}
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" type="submit">Guardar</button>
              <button className="btn-ghost" type="button" onClick={importSeed}>Lista Cootravir</button>
            </div>
          </form>

          <h2 style={{ marginTop: 32 }}>En este tipo ({ofType.length})</h2>
          <div className="list">
            {!ofType.length && <div className="empty">Todavía no hay contactos aquí.</div>}
            {ofType.map((contact) => (
              <article key={contact.id} className="card">
                <div className="card-head">
                  <div>
                    <h3 className="conjunto">{displayTitle(contact)}</h3>
                    <p className="meta">{contact.nombre} · <span className="phone">+57 {contact.telefono}</span></p>
                  </div>
                  <div className="card-actions">
                    <Link className="btn btn-ghost btn-small" href={`/seguimiento?contacto=${contact.id}`}>Seguimiento</Link>
                    <button className="btn-danger btn-small" type="button" onClick={() => removeContact(contact.id)}>Eliminar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
