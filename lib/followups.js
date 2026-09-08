import { query } from "@/lib/db";

const KINDS = new Set(["respuesta", "nota", "llamada"]);

export function isValidKind(kind) {
  return KINDS.has(kind);
}

export async function getOwnedContact(userId, contactId) {
  const rows = await query(
    `SELECT c.*, t.name AS type_name
     FROM com_contacts c
     LEFT JOIN com_types t ON t.id = c.type_id
     WHERE c.id = ? AND c.user_id = ?
     LIMIT 1`,
    [contactId, userId]
  );
  return rows[0] || null;
}

export function parseOccurredAt(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function getTimeline(userId, contactId) {
  const notes = await query(
    `SELECT id, kind, body, occurred_at, created_at
     FROM com_followups
     WHERE user_id = ? AND contact_id = ?
     ORDER BY occurred_at DESC, id DESC`,
    [userId, contactId]
  );
  const sends = await query(
    `SELECT id, body, success, created_at
     FROM com_send_logs
     WHERE user_id = ? AND contact_id = ?
     ORDER BY created_at DESC`,
    [userId, contactId]
  );

  const events = [
    ...notes.map((row) => ({
      id: `note-${row.id}`,
      followupId: row.id,
      source: "followup",
      kind: row.kind,
      body: row.body,
      occurred_at: row.occurred_at,
      canDelete: true,
    })),
    ...sends.map((row) => ({
      id: `send-${row.id}`,
      followupId: null,
      source: "send",
      kind: "enviado",
      body: row.success ? row.body : `Falló el envío. ${row.body || ""}`.trim(),
      occurred_at: row.created_at,
      canDelete: false,
    })),
  ];

  events.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  return events;
}

