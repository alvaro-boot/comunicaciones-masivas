import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const fields = [];
    const values = [];

    for (const key of ["conjunto", "nombre", "saludo", "telefono"]) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === "telefono" ? String(body[key]).replace(/\D/g, "") : String(body[key]).trim());
      }
    }
    if (body.typeId !== undefined) {
      fields.push("type_id = ?");
      values.push(body.typeId || null);
    }
    if (body.extras !== undefined) {
      fields.push("extras = ?");
      values.push(JSON.stringify(body.extras || {}));
    }
    if (body.sent !== undefined) {
      fields.push("sent = ?", "sent_at = ?", "last_error = ?");
      values.push(body.sent ? 1 : 0, body.sent ? new Date() : null, body.sent ? null : body.last_error || null);
    }
    if (body.last_error !== undefined && body.sent === undefined) {
      fields.push("last_error = ?");
      values.push(body.last_error);
    }
    if (!fields.length) {
      return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
    }

    values.push(id, user.id);
    await query(
      `UPDATE com_contacts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      values
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
