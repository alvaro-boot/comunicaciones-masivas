import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getOwnedContact, getTimeline, isValidKind, parseOccurredAt } from "@/lib/followups";

export async function GET(_request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const contact = await getOwnedContact(user.id, id);
    if (!contact) return NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
    const events = await getTimeline(user.id, contact.id);
    return NextResponse.json({ contact, events });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const contact = await getOwnedContact(user.id, id);
    if (!contact) return NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });

    const payload = await request.json();
    const kind = String(payload.kind || "nota").trim();
    const body = String(payload.body || "").trim();
    if (!isValidKind(kind)) {
      return NextResponse.json({ error: "Tipo de registro no válido." }, { status: 400 });
    }
    if (!body) {
      return NextResponse.json({ error: "Escribe qué ocurrió." }, { status: 400 });
    }

    const occurredAt = parseOccurredAt(payload.occurred_at);
    const result = await query(
      `INSERT INTO com_followups (user_id, contact_id, kind, body, occurred_at)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, contact.id, kind, body, occurredAt]
    );
    return NextResponse.json({ ok: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
