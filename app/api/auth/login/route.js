import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const rows = await query(
      "SELECT id, name, email, password_hash FROM com_users WHERE email = ? LIMIT 1",
      [cleanEmail]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    await setSessionCookie(
      await signSession({ id: user.id, name: user.name, email: user.email })
    );
    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "No se pudo iniciar sesión." }, { status: 500 });
  }
}
