import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fieldKey } from "@/lib/fields";
import { getUserType } from "@/lib/types";

export async function PUT(request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const type = await getUserType(user.id, id);
    if (!type) return NextResponse.json({ error: "Tipo no encontrado." }, { status: 404 });

    const body = await request.json();
    const name = String(body.name ?? type.name).trim();
    const template = body.template !== undefined ? String(body.template || "") : type.template;
    if (!name) return NextResponse.json({ error: "El tipo necesita un nombre." }, { status: 400 });

    await query("UPDATE com_types SET name = ?, template = ? WHERE id = ? AND user_id = ?", [
      name,
      template,
      id,
      user.id,
    ]);

    if (Array.isArray(body.fields)) {
      await query("DELETE FROM com_type_fields WHERE type_id = ?", [id]);
      for (let i = 0; i < body.fields.length; i += 1) {
        const label = String(body.fields[i].label || "").trim();
        if (!label) continue;
        const key = fieldKey(body.fields[i].key || label);
        await query(
          "INSERT INTO com_type_fields (type_id, field_key, label, sort_order) VALUES (?, ?, ?, ?)",
          [id, key, label, i]
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const type = await getUserType(user.id, id);
    if (!type) return NextResponse.json({ error: "Tipo no encontrado." }, { status: 404 });
    await query("UPDATE com_contacts SET type_id = NULL WHERE user_id = ? AND type_id = ?", [user.id, id]);
    await query("DELETE FROM com_types WHERE id = ? AND user_id = ?", [id, user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
