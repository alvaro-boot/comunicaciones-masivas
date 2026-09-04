import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { SEED_CONTACTS } from "@/lib/seed-contacts";
import { ensureDefaultType } from "@/lib/types";

export async function POST() {
  try {
    const user = await requireUser();
    const typeId = await ensureDefaultType(user.id);
    let imported = 0;
    for (const contact of SEED_CONTACTS) {
      const extras = JSON.stringify({ conjunto: contact.conjunto });
      const result = await query(
        `INSERT INTO com_contacts (user_id, type_id, conjunto, nombre, saludo, telefono, extras)
         SELECT ?, ?, ?, ?, ?, ?, ?
         FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM com_contacts
           WHERE user_id = ? AND telefono = ? AND conjunto = ?
         )`,
        [
          user.id,
          typeId,
          contact.conjunto,
          contact.nombre,
          contact.saludo,
          contact.telefono,
          extras,
          user.id,
          contact.telefono,
          contact.conjunto,
        ]
      );
      if (result.affectedRows) imported += 1;
    }
    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
