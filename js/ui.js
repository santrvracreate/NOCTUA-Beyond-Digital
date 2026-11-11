const $ = (s) => document.querySelector(s);
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text != null) n.textContent = String(text);
  if (cls) n.className = cls;
  return n;
}
function notice(selector, text, kind = "info") {
  const n = typeof selector === "string" ? $(selector) : selector;
  n.textContent = text;
  n.dataset.kind = kind;
}
function show(selector, visible) {
  $(selector).hidden = !visible;
}
function button(text, action, cls = "") {
  const b = el("button", text, cls);
  b.type = "button";
  b.addEventListener("click", () => Promise.resolve().then(action).catch((e) => notice("#app-notice", errorText(e), "error")));
  return b;
}
function errorText(e) {
  if (e?.code === "23503") return "Este registro tiene informaci\xF3n relacionada. No se puede eliminar.";
  if (e?.code === "23505") return "Ya existe un registro con esos datos.";
  if (e?.code === "42501") return "No tienes permiso para esta operaci\xF3n.";
  return e?.userMessage || "No se pudo completar la operaci\xF3n. Revisa tu conexi\xF3n y permisos e int\xE9ntalo de nuevo.";
}
function bindForm(id, output, action) {
  $(id).addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = event.currentTarget;
    if (f.dataset.busy) return;
    if (!f.reportValidity()) return;
    f.dataset.busy = "true";
    const b = f.querySelector("[type=submit]");
    if (b) b.disabled = true;
    try {
      notice(output, "Procesando\u2026");
      await action(f);
    } catch (e) {
      notice(output, errorText(e), "error");
    } finally {
      delete f.dataset.busy;
      if (b) b.disabled = false;
    }
  });
}
function modal(title, content) {
  const d = $("#record-dialog");
  $("#dialog-content").replaceChildren(el("h2", title), content, button("Cerrar", () => d.close(), "button-secondary"));
  if (!d.open) d.showModal();
}
function field(name, label, value = "", type = "text", options) {
  const l = el("label", label);
  const n = document.createElement(options ? "select" : type === "textarea" ? "textarea" : "input");
  n.name = name;
  if (!options && type !== "textarea") n.type = type;
  if (options) for (const [v, t] of options) {
    const o = el("option", t);
    o.value = v;
    n.append(o);
  }
  if (type === "checkbox") n.checked = !!value;
  else n.value = value ?? "";
  l.append(n);
  return l;
}
function empty(target, text) {
  target.replaceChildren(el("p", text, "empty-state"));
}
export {
  $,
  bindForm,
  button,
  el,
  empty,
  errorText,
  field,
  modal,
  notice,
  show
};
