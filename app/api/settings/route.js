import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { DEFAULT_TEMPLATE } from "@/lib/ultramsg";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await query(
      "SELECT ultramsg_instance, ultramsg_token, message_template, delay_ms FROM com_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const settings = rows[0] || {};
    return NextResponse.json({
      instance: settings.ultramsg_instance || "",
      hasToken: Boolean(settings.ultramsg_token),
      template: settings.message_template || DEFAULT_TEMPLATE,
      delayMs: settings.delay_ms || 4000,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await requireUser();
    const { instance, token, template, delayMs } = await request.json();
    const current = await query(
      "SELECT ultramsg_token FROM com_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const nextToken =
      token && String(token).trim()
        ? String(token).trim()
        : current[0]?.ultramsg_token || null;

    await query(
      `INSERT INTO com_settings (user_id, ultramsg_instance, ultramsg_token, message_template, delay_ms)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ultramsg_instance = VALUES(ultramsg_instance),
         ultramsg_token = VALUES(ultramsg_token),
         message_template = VALUES(message_template),
         delay_ms = VALUES(delay_ms)`,
      [
        user.id,
        String(instance || "").trim() || null,
        nextToken,
        String(template || DEFAULT_TEMPLATE),
        Number(delayMs) > 1000 ? Number(delayMs) : 4000,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
