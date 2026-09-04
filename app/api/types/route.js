import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { fieldKey } from "@/lib/fields";
import { ensureDefaultType, getTypeFields } from "@/lib/types";
import { DEFAULT_TEMPLATE } from "@/lib/ultramsg";

export async function GET() {
  try {
    const user = await requireUser();
    await ensureDefaultType(user.id);
    const types = await query(
      "SELECT id, name, template, created_at FROM com_types WHERE user_id = ? ORDER BY id ASC",
      [user.id]
    );
    const withFields = [];
    for (const type of types) {
      withFields.push({ ...type, fields: await getTypeFields(type.id) });
    }
    return NextResponse.json({ types: withFields });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "El tipo necesita un nombre." }, { status: 400 });

    const template = String(body.template || "").trim() || DEFAULT_TEMPLATE;
    const created = await query(
      "INSERT INTO com_types (user_id, name, template) VALUES (?, ?, ?)",
      [user.id, name, template]
    );
    const fields = Array.isArray(body.fields) ? body.fields : [];
    for (let i = 0; i < fields.length; i += 1) {
      const label = String(fields[i].label || fields[i].key || "").trim();
      if (!label) continue;
      const key = fieldKey(fields[i].key || label);
      await query(
        "INSERT INTO com_type_fields (type_id, field_key, label, sort_order) VALUES (?, ?, ?, ?)",
        [created.insertId, key, label, i]
      );
    }
    return NextResponse.json({ ok: true, id: created.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
