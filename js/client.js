import { db, result, list, PAGE_SIZE } from "./data.js";
import { $, el, field, button, notice, errorText, empty } from "./ui.js";
import { requiredText } from "./validation.js";
async function mountClient(userId) {
  const root = $("#client-content");
  const f = el("form");
  f.append(el("h3", "Solicitar una cotizaci\xF3n"), field("detalle", "Cu\xE9ntanos qu\xE9 necesitas", "", "textarea"));
  f.elements.detalle.required = true;
  f.elements.detalle.maxLength = 5e3;
  const b = el("button", "Enviar solicitud");
  b.type = "submit";
  const msg = el("p", null, "feedback");
  msg.setAttribute("role", "status");
  f.append(b, msg);
  const records = el("div");
  let page = 0;
  async function load() {
    try {
      const r = await list("solicitudes", "id,detalle,estado,created_at", { page, filters: { id_cliente: userId } });
      records.replaceChildren(el("h3", "Mis solicitudes"));
      for (const s of r.data) {
        const c = el("article", null, "panel-card");
        c.append(el("p", s.detalle), el("span", s.estado, "badge"));
        records.append(c);
      }
      if (!r.data.length) records.append(el("p", "A\xFAn no tienes solicitudes.", "empty-state"));
      const prev = button("Anterior", () => {
        page--;
        load();
      });
      prev.disabled = page === 0;
      const next = button("Siguiente", () => {
        page++;
        load();
      });
      next.disabled = (page + 1) * PAGE_SIZE >= r.count;
      records.append(prev, next);
    } catch (e) {
      empty(records, errorText(e));
    }
  }
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (b.disabled || !f.reportValidity()) return;
    b.disabled = true;
    try {
      await result(db.from("solicitudes").insert({ id_cliente: userId, detalle: requiredText(f.elements.detalle.value, 5e3), estado: "pendiente", id_proyecto: null }));
      f.reset();
      notice(msg, "Solicitud enviada.");
      page = 0;
      await load();
    } catch (err) {
      notice(msg, errorText(err), "error");
    } finally {
      b.disabled = false;
    }
  });
  root.replaceChildren(f, records);
  await load();
}
export {
  mountClient
};
