const statuses = { en_progreso: "En progreso", completado: "Completado", cancelado: "Cancelado" };
function requiredText(value, max = 120) {
  const s = String(value ?? "").trim();
  if (!s || s.length > max) throw Object.assign(new Error(), { userMessage: "Completa el texto requerido (m\xE1ximo " + max + " caracteres)." });
  return s;
}
function safeUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
function projectPayload(values) {
  const p = { ...values, nombre: requiredText(values.nombre), descripcion: String(values.descripcion || "").trim().slice(0, 5e3) || null };
  if (!Object.hasOwn(statuses, p.estado)) throw new Error("Estado inv\xE1lido");
  if (p.visible_clientes && p.estado !== "completado") throw Object.assign(new Error(), { userMessage: "Solo se pueden publicar proyectos completados." });
  for (const k of ["url_demo", "url_produccion"]) {
    if (p[k] && !safeUrl(p[k])) throw Object.assign(new Error(), { userMessage: "Usa una URL completa http o https." });
    p[k] = safeUrl(p[k]);
  }
  return p;
}
function boliviaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function period(desde, hasta) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || desde > hasta) throw Object.assign(new Error(), { userMessage: "Selecciona un periodo v\xE1lido." });
  const start = /* @__PURE__ */ new Date(desde + "T00:00:00-04:00");
  const end = /* @__PURE__ */ new Date(hasta + "T00:00:00-04:00");
  end.setUTCDate(end.getUTCDate() + 1);
  return [start.toISOString(), end.toISOString()];
}
export {
  boliviaDate,
  period,
  projectPayload,
  requiredText,
  safeUrl,
  statuses
};
