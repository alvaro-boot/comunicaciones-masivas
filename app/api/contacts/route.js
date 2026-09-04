import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { parseExtras } from "@/lib/fields";
import { ensureDefaultType, getTypeFields, getUserType } from "@/lib/types";

function titleFromExtras(extras, fallback) {
  return extras.conjunto || extras.empresa || fallback || "";
}

export async function GET() {
  try {
    const user = await requireUser();
    await ensureDefaultType(user.id);
    const rows = await query(
      `SELECT c.id, c.type_id, c.conjunto, c.nombre, c.saludo, c.telefono, c.extras,
              c.sent, c.sent_at, c.last_error, c.created_at, t.name AS type_name
       FROM com_contacts c
       LEFT JOIN com_types t ON t.id = c.type_id
       WHERE c.user_id = ?
       ORDER BY c.id ASC`,
      [user.id]
    );
    const contacts = rows.map((row) => ({
      ...row,
      extras: parseExtras(row.extras),
    }));
    return NextResponse.json({ contacts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const typeId = Number(body.typeId || body.type_id);
    const type = await getUserType(user.id, typeId);
    if (!type) {
      return NextResponse.json({ error: "Elige un tipo de contacto." }, { status: 400 });
    }

    const nombre = String(body.nombre || "").trim();
    const telefono = String(body.telefono || "").replace(/\D/g, "");
    let saludo = String(body.saludo || "").trim();
    if (!nombre || !telefono) {
      return NextResponse.json({ error: "Nombre y teléfono son obligatorios." }, { status: 400 });
    }
    if (!saludo) saludo = nombre.split(" ")[0];

    const fields = await getTypeFields(type.id);
    const incoming = body.extras && typeof body.extras === "object" ? body.extras : body;
    const extras = {};
    for (const field of fields) {
      extras[field.field_key] = String(incoming[field.field_key] || "").trim();
    }

    const conjunto = extras.conjunto || titleFromExtras(extras, nombre);
    const result = await query(
      `INSERT INTO com_contacts (user_id, type_id, conjunto, nombre, saludo, telefono, extras)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, type.id, conjunto, nombre, saludo, telefono, JSON.stringify(extras)]
    );
    return NextResponse.json({ ok: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
