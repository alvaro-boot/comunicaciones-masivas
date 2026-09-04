import { query } from "@/lib/db";
import { DEFAULT_TEMPLATE } from "@/lib/ultramsg";

export async function ensureDefaultType(userId) {
  const types = await query("SELECT id FROM com_types WHERE user_id = ? ORDER BY id ASC LIMIT 1", [userId]);
  if (types[0]) return types[0].id;

  const created = await query("INSERT INTO com_types (user_id, name, template) VALUES (?, ?, ?)", [
    userId,
    "Unidades PH",
    DEFAULT_TEMPLATE,
  ]);
  const typeId = created.insertId;
  await query(
    "INSERT INTO com_type_fields (type_id, field_key, label, sort_order) VALUES (?, ?, ?, ?)",
    [typeId, "conjunto", "Conjunto / edificio", 0]
  );
  const contacts = await query("SELECT id, conjunto FROM com_contacts WHERE user_id = ? AND (type_id IS NULL OR type_id = 0)", [userId]);
  for (const contact of contacts) {
    await query("UPDATE com_contacts SET type_id = ?, extras = ? WHERE id = ? AND user_id = ?", [
      typeId,
      JSON.stringify({ conjunto: contact.conjunto || "" }),
      contact.id,
      userId,
    ]);
  }
  return typeId;
}

export async function getUserType(userId, typeId) {
  const rows = await query("SELECT * FROM com_types WHERE id = ? AND user_id = ? LIMIT 1", [typeId, userId]);
  return rows[0] || null;
}

export async function getTypeFields(typeId) {
  return query(
    "SELECT id, field_key, label, sort_order FROM com_type_fields WHERE type_id = ? ORDER BY sort_order ASC, id ASC",
    [typeId]
  );
}
