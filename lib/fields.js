export function fieldKey(label) {
  const key = String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return key || "campo";
}

export function parseExtras(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function displayTitle(contact) {
  const extras = parseExtras(contact.extras);
  return extras.conjunto || contact.conjunto || extras.empresa || contact.nombre || "Contacto";
}

export function composeMessage(template, contact, userName) {
  const extras = parseExtras(contact.extras);
  const values = {
    nombre: contact.saludo || contact.nombre || "",
    usuario: userName || "",
    conjunto: extras.conjunto || contact.conjunto || "",
    ...extras,
  };
  let out = String(template || "");
  const keys = Object.keys(values).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.replaceAll(`{${key}}`, values[key] ?? "");
  }
  return out.trim();
}
