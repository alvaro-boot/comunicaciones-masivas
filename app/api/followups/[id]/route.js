import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function DELETE(_request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await query("DELETE FROM com_followups WHERE id = ? AND user_id = ?", [id, user.id]);
    if (!result.affectedRows) {
      return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
