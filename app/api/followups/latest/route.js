import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const notes = await query(
      `SELECT f.contact_id, f.kind, f.body, f.occurred_at
       FROM com_followups f
       INNER JOIN (
         SELECT contact_id, MAX(occurred_at) AS max_at
         FROM com_followups
         WHERE user_id = ?
         GROUP BY contact_id
       ) last ON last.contact_id = f.contact_id AND f.occurred_at = last.max_at
       WHERE f.user_id = ?
       ORDER BY f.id DESC`,
      [user.id, user.id]
    );
    const latest = {};
    for (const row of notes) {
      if (!latest[row.contact_id]) latest[row.contact_id] = row;
    }
    return NextResponse.json({ latest });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
