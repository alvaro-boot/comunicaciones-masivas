import { composeMessage as fillTemplate } from "./fields";

export const DEFAULT_TEMPLATE =
  "Hola {nombre}, habla {usuario}. Me comunico para el proceso de Cootravir PH en las unidades residenciales, en este caso {conjunto}. Quedo atento a su respuesta para avanzar.";

export function composeMessage(template, contact, userName) {
  return fillTemplate(template || DEFAULT_TEMPLATE, contact, userName);
}

export function toInternational(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return digits;
  return `57${digits}`;
}

export async function ultramsgRequest(instanceId, token, path, options = {}) {
  const base = `https://api.ultramsg.com/${instanceId}${path}`;
  const url = options.method === "GET" || !options.method
    ? `${base}?token=${encodeURIComponent(token)}${options.query || ""}`
    : base;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body
      ? { "content-type": "application/x-www-form-urlencoded" }
      : undefined,
    body: options.body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return { ok: response.ok, status: response.status, data: await response.json() };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { ok: response.ok, status: response.status, buffer, contentType };
}

export async function getInstanceStatus(instanceId, token) {
  const result = await ultramsgRequest(instanceId, token, "/instance/status");
  const account = result.data?.status?.accountStatus || {};
  return {
    ok: result.ok,
    authenticated: account.status === "authenticated",
    status: account.status || "unknown",
    substatus: account.substatus || "",
    instanceId,
  };
}

export async function sendChatMessage(instanceId, token, to, body, referenceId) {
  const params = new URLSearchParams({
    token,
    to,
    body,
    priority: "5",
    referenceId: referenceId || "",
  });
  const result = await ultramsgRequest(instanceId, token, "/messages/chat", {
    method: "POST",
    body: params,
  });
  const sent = result.data?.sent === true || result.data?.sent === "true";
  return {
    ok: sent,
    id: result.data?.id || null,
    message: result.data?.message || "",
    error: sent ? null : result.data?.error || result.data?.message || "UltraMsg no envió el mensaje.",
    raw: result.data,
  };
}
