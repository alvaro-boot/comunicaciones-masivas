import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { parseExtras } from "@/lib/fields";
import { getTypeFields, getUserType } from "@/lib/types";

function titleFromExtras(extras, fallback) {
  return extras.conjunto || extras.empresa || fallback || "";
}

function buildExtras(fields, incoming) {
  const extras = {};
  for (const field of fields) {
    extras[field.field_key] = String(incoming[field.field_key] || "").trim();
  }
  return extras;
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await query("SELECT * FROM com_contacts WHERE id = ? AND user_id = ? LIMIT 1", [id, user.id]);
    const current = rows[0];
    if (!current) {
      return NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const typeId = body.typeId !== undefined ? Number(body.typeId) : current.type_id;
    const type = await getUserType(user.id, typeId);
    if (!type) {
      return NextResponse.json({ error: "Elige un tipo de contacto." }, { status: 400 });
    }

    const nombre = body.nombre !== undefined ? String(body.nombre || "").trim() : current.nombre;
    const telefono =
      body.telefono !== undefined ? String(body.telefono || "").replace(/\D/g, "") : current.telefono;
    let saludo = body.saludo !== undefined ? String(body.saludo || "").trim() : current.saludo;
    if (!nombre || !telefono) {
      return NextResponse.json({ error: "Nombre y teléfono son obligatorios." }, { status: 400 });
    }
    if (!saludo) saludo = nombre.split(" ")[0];

    const fields = await getTypeFields(type.id);
    const incoming =
      body.extras && typeof body.extras === "object" ? body.extras : parseExtras(current.extras);
    const extras = buildExtras(fields, incoming);
    const conjunto = extras.conjunto || titleFromExtras(extras, nombre);

    await query(
      `UPDATE com_contacts
       SET type_id = ?, conjunto = ?, nombre = ?, saludo = ?, telefono = ?, extras = ?
       WHERE id = ? AND user_id = ?`,
      [type.id, conjunto, nombre, saludo, telefono, JSON.stringify(extras), id, user.id]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await query("DELETE FROM com_contacts WHERE id = ? AND user_id = ?", [id, user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
