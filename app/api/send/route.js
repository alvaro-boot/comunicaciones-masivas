import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { composeMessage, getInstanceStatus, sendChatMessage, toInternational } from "@/lib/ultramsg";

export async function POST(request) {
  try {
    const user = await requireUser();
    const { contactId } = await request.json();
    const settingsRows = await query(
      "SELECT ultramsg_instance, ultramsg_token, message_template FROM com_settings WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const settings = settingsRows[0];
    if (!settings?.ultramsg_instance || !settings?.ultramsg_token) {
      return NextResponse.json(
        { error: "Configura tu instancia y token de UltraMsg en Configuración." },
        { status: 400 }
      );
    }

    const status = await getInstanceStatus(settings.ultramsg_instance, settings.ultramsg_token);
    if (!status.authenticated) {
      return NextResponse.json(
        { error: `UltraMsg no está vinculado (${status.status}). Escanea el QR en Configuración.` },
        { status: 400 }
      );
    }

    const contacts = await query(
      "SELECT * FROM com_contacts WHERE id = ? AND user_id = ? LIMIT 1",
      [contactId, user.id]
    );
    const contact = contacts[0];
    if (!contact) {
      return NextResponse.json({ error: "Contacto no encontrado." }, { status: 404 });
    }

    let template = settings.message_template;
    if (contact.type_id) {
      const typeRows = await query(
        "SELECT template FROM com_types WHERE id = ? AND user_id = ? LIMIT 1",
        [contact.type_id, user.id]
      );
      if (typeRows[0]?.template) template = typeRows[0].template;
    }

    const body = composeMessage(template, contact, user.name);
    const to = toInternational(contact.telefono);
    const result = await sendChatMessage(
      settings.ultramsg_instance,
      settings.ultramsg_token,
      to,
      body,
      `ph-${user.id}-${contact.id}`
    );

    await query(
      `INSERT INTO com_send_logs (user_id, contact_id, phone, body, success, response_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, contact.id, to, body, result.ok ? 1 : 0, JSON.stringify(result.raw || {})]
    );

    await query(
      "UPDATE com_contacts SET sent = ?, sent_at = ?, last_error = ? WHERE id = ? AND user_id = ?",
      [result.ok ? 1 : 0, result.ok ? new Date() : null, result.ok ? null : result.error, contact.id, user.id]
    );

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
