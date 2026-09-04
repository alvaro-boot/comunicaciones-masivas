import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";
import { DEFAULT_TEMPLATE } from "@/lib/ultramsg";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (cleanName.length < 2 || !cleanEmail.includes("@") || cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Nombre, correo y una contraseña de al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(cleanPassword, 10);
    const result = await query(
      "INSERT INTO com_users (name, email, password_hash) VALUES (?, ?, ?)",
      [cleanName, cleanEmail, hash]
    );
    const userId = result.insertId;
    await query(
      "INSERT INTO com_settings (user_id, message_template, delay_ms) VALUES (?, ?, ?)",
      [userId, DEFAULT_TEMPLATE, 4000]
    );

    const user = { id: userId, name: cleanName, email: cleanEmail };
    await setSessionCookie(await signSession(user));
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Ese correo ya tiene una cuenta." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "No se pudo registrar." }, { status: 500 });
  }
}
