import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { ultramsgRequest } from "@/lib/ultramsg";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await query(
      "SELECT ultramsg_instance, ultramsg_token FROM com_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const settings = rows[0];
    if (!settings?.ultramsg_instance || !settings?.ultramsg_token) {
      return NextResponse.json({ error: "Sin claves UltraMsg." }, { status: 400 });
    }

    const result = await ultramsgRequest(
      settings.ultramsg_instance,
      settings.ultramsg_token,
      "/instance/qr"
    );
    if (result.buffer) {
      return new NextResponse(result.buffer, {
        status: result.status,
        headers: {
          "Content-Type": result.contentType || "image/png",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(result.data || { error: "No hay QR" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
