import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getInstanceStatus } from "@/lib/ultramsg";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await query(
      "SELECT ultramsg_instance, ultramsg_token FROM com_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const settings = rows[0];
    if (!settings?.ultramsg_instance || !settings?.ultramsg_token) {
      return NextResponse.json({
        configured: false,
        authenticated: false,
        status: "sin claves",
      });
    }

    const status = await getInstanceStatus(settings.ultramsg_instance, settings.ultramsg_token);
    return NextResponse.json({ configured: true, ...status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
