import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const rows = await query(
    "SELECT ultramsg_instance, ultramsg_token FROM com_settings WHERE user_id = ? LIMIT 1",
    [session.id]
  );
  const settings = rows[0] || {};
  return NextResponse.json({
    user: session,
    hasKeys: Boolean(settings.ultramsg_instance && settings.ultramsg_token),
  });
}
