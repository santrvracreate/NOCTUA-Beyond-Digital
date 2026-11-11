import { db, result, list, save, remove, count, PAGE_SIZE } from "./data.js";
import { $, el, button, field, modal, empty, errorText, notice } from "./ui.js";
import { projectPayload, requiredText, period, boliviaDate, statuses } from "./validation.js";
const schemas = {
      proyectos: { title: "Proyectos", columns: "id,nombre,descripcion,estado,id_cliente,id_categoria,url_demo,url_produccion,visible_clientes,created_at", fields: [["nombre", "Nombre"], ["descripcion", "Descripci\xF3n", "textarea"], ["id_cliente", "ID del cliente"], ["id_categoria", "ID de categor\xEDa", "number"], ["estado", "Estado", "select", [["en_progreso", "En progreso"], ["completado", "Completado"], ["cancelado", "Cancelado"]]], ["url_demo", "URL de avance", "url"], ["url_produccion", "Enlace directo a la página web", "url"], ["visible_clientes", "Publicar en portafolio", "checkbox"]] },
  usuarios: { title: "Usuarios y clientes", table: "clientes", columns: "id,nombre,telefono,created_at", fields: [["nombre", "Nombre"], ["telefono", "Tel\xE9fono", "tel"]], noCreate: true, noDelete: true },
  categorias: { title: "Categor\xEDas", columns: "id,nombre", fields: [["nombre", "Nombre"]] },
  solicitudes: { title: "Solicitudes", columns: "id,detalle,estado,id_cliente,id_proyecto,created_at", search: "detalle", fields: [["detalle", "Detalle", "textarea"], ["id_cliente", "ID del cliente"], ["id_proyecto", "ID del proyecto", "number"], ["estado", "Estado", "select", [["pendiente", "Pendiente"], ["aceptada", "Aceptada"], ["rechazada", "Rechazada"], ["convertida", "Convertida"]]]] },
  mensajes: { title: "Mensajes", columns: "id,id_usuario,contenido,created_at", search: "contenido", fields: [["contenido", "Mensaje", "textarea"]], noCreate: true, noEdit: true }
};
function mountAdmin(onProjectsChanged) {
  const root = $("#admin-content");
  let active = true, version = 0, current = "dashboard", page = 0, search = "", sort = "recent";
  const controller = new AbortController();
  async function render() {
    const ticket = ++version;
    empty(root, "Cargando\u2026");
    try {
      if (current === "dashboard") {
        await dashboard(ticket);
        return;
      }
      if (current === "usuarios") {
        await renderUsers(ticket);
        return;
      }
      const config = schemas[current];
      if (!config) {
        empty(root, "Este m\xF3dulo requiere la ampliaci\xF3n de base de datos y el servicio administrativo pendientes de despliegue.");
        return;
      }
      const table = config.table || current;
      const r = await list(table, config.columns, { page, search, searchColumn: config.search || "nombre", sort: sort === "name" ? config.search || "nombre" : "id", ascending: sort === "name" });
      if (!active || ticket !== version) return;
      const heading = el("div", null, "panel-heading");
      heading.append(el("h2", config.title));
      if (!config.noCreate) heading.append(button("Crear registro", () => edit(config, table)));
      const toolbar = el("form", null, "toolbar");
      const input = field("search", "Buscar", search, "search");
      toolbar.append(input, field("sort", "Ordenar", sort, "select", [["recent", "M\xE1s recientes"], ["name", "Nombre / contenido"]]));
      const submit = el("button", "Filtrar");
      submit.type = "submit";
      toolbar.append(submit);
      toolbar.addEventListener("submit", (e) => {
        e.preventDefault();
        search = toolbar.elements.search.value;
        sort = toolbar.elements.sort.value;
        page = 0;
        render();
      });
      const wrap = el("div", null, "table-wrap");
      wrap.tabIndex = 0;
      wrap.setAttribute("aria-label", config.title);
      const t = el("table", null, "data-table");
      const head = el("thead");
      const hr = el("tr");
      for (const name of ["Registro", "Estado / fecha", "Acciones"]) hr.append(el("th", name));
      head.append(hr);
      t.append(head);
      const body = el("tbody");
      for (const row of r.data) {
        const tr = el("tr");
        tr.append(el("td", row.nombre || row.detalle || row.contenido), el("td", row.estado || (row.created_at ? new Date(row.created_at).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" }) : "—")));
        const actions = el("td");
        actions.append(button("Ver", () => details(row)));
        if (!config.noEdit) actions.append(button("Editar", () => edit(config, table, row), "button-secondary"));
        if (current === "usuarios") actions.append(button("Rol", () => roleEditor(row), "button-secondary"));
        if (!config.noDelete) actions.append(button("Eliminar", async () => {
          if (!confirm("\xBFEliminar este registro? Esta acci\xF3n no se puede deshacer.")) return;
          await remove(table, row.id);
          await render();
          if (table === "proyectos") await onProjectsChanged();
        }, "button-danger"));
        tr.append(actions);
        body.append(tr);
      }
      t.append(body);
      wrap.append(t);
      const nav = el("nav", null, "pagination");
      const prev = button("Anterior", () => {
        page--;
        render();
      }, "button-secondary");
      prev.disabled = page === 0;
      const next = button("Siguiente", () => {
        page++;
        render();
      }, "button-secondary");
      next.disabled = (page + 1) * PAGE_SIZE >= r.count;
      nav.append(prev, el("span", "P\xE1gina " + (page + 1) + " \xB7 " + r.count + " registros"), next);
      root.replaceChildren(heading, toolbar, r.data.length ? wrap : el("p", "No hay registros.", "empty-state"), nav);
      if (current === "usuarios") root.append(el("p", "Las cuentas nuevas se registran desde el formulario p\xFAblico. Invitaci\xF3n, bloqueo y recuperaci\xF3n administrativa requieren el servicio de servidor pendiente.", "field-help"));
    } catch (e) {
      if (active && ticket === version) empty(root, errorText(e));
    }
  }
  async function adminAction(body) {
    const { data, error } = await db.functions.invoke("admin-users", { body });
    if (error) throw error;
    if (data?.error) throw Object.assign(new Error(data.error), { userMessage: data.error });
    return data;
  }
  async function renderUsers(ticket) {
    const response = await adminAction({ action: "list", page: page + 1 });
    if (!active || ticket !== version) return;
    const users = response.users.filter((user) => !search || `${user.nombre || ""} ${user.email || ""} ${user.rol || ""}`.toLowerCase().includes(search.toLowerCase()));
    const heading = el("div", null, "panel-heading");
    heading.append(el("h2", "Usuarios y perfiles"), button("Invitar usuario", inviteUser));
    const toolbar = el("form", null, "toolbar");
    toolbar.append(field("search", "Buscar", search, "search"));
    const submit = el("button", "Filtrar");
    submit.type = "submit";
    toolbar.append(submit);
    toolbar.addEventListener("submit", (event) => { event.preventDefault(); search = toolbar.elements.search.value; page = 0; render(); });
    const table = el("table", null, "data-table");
    const head = el("thead");
    const header = el("tr");
    for (const label of ["Nombre", "Correo", "Teléfono", "Rol", "Acciones"]) header.append(el("th", label));
    head.append(header); table.append(head);
    const body = el("tbody");
    for (const user of users) {
      const row = el("tr");
      row.append(el("td", user.nombre || "—"), el("td", user.email || "—"), el("td", user.telefono || "—"), el("td", user.rol === "admin" ? "Administrador" : "Cliente"));
      const actions = el("td");
      actions.append(button("Ver perfil", () => details({ id: user.id, nombre: user.nombre, email: user.email, telefono: user.telefono, rol: user.rol, correo_confirmado: user.email_confirmed ? "Sí" : "Pendiente" })));
      actions.append(button("Cambiar rol", () => roleEditor({ id: user.id, nombre: user.nombre }), "button-secondary"));
      actions.append(button("Restablecer contraseña", async () => { await adminAction({ action: "reset_password", user_id: user.id }); notice("#app-notice", "Enviamos instrucciones de cambio al correo de la cuenta."); }, "button-secondary"));
      actions.append(button("Eliminar", async () => { if (!confirm(`¿Eliminar la cuenta de ${user.email}? Esta acción no se puede deshacer.`)) return; await adminAction({ action: "delete", user_id: user.id }); await render(); }, "button-danger"));
      row.append(actions); body.append(row);
    }
    table.append(body);
    const wrap = el("div", null, "table-wrap");
    wrap.append(table);
    const next = button("Siguiente", () => { page++; render(); }, "button-secondary");
    next.disabled = response.users.length < 50;
    const prev = button("Anterior", () => { page--; render(); }, "button-secondary");
    prev.disabled = page === 0;
    const nav = el("nav", null, "pagination");
    nav.append(prev, el("span", `Página ${page + 1} · ${users.length} cuentas`), next);
    root.replaceChildren(heading, toolbar, wrap, nav);
  }
  function inviteUser() {
    const form = el("form", null, "form-grid");
    form.append(field("nombre", "Nombre", "", "text"), field("email", "Correo", "", "email"), field("telefono", "Teléfono", "", "tel"));
    form.elements.nombre.required = true;
    form.elements.email.required = true;
    const submit = el("button", "Enviar invitación"); submit.type = "submit";
    const feedback = el("p", null, "feedback"); feedback.setAttribute("role", "status");
    form.append(submit, feedback);
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); if (!form.reportValidity() || submit.disabled) return;
      submit.disabled = true;
      try {
        await adminAction({ action: "invite", name: form.elements.nombre.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.telefono.value.trim() });
        $("#record-dialog").close(); notice("#app-notice", "Invitación enviada. La persona podrá activar su cuenta desde el correo."); await render();
      } catch (error) { notice(feedback, errorText(error), "error"); }
      finally { submit.disabled = false; }
    });
    modal("Invitar cliente", form);
  }
  function details(row) {
    const dl = el("dl", null, "detail-list");
    for (const [k, v] of Object.entries(row)) {
      dl.append(el("dt", k), el("dd", v === null ? "\u2014" : String(v)));
    }
    modal("Detalle del registro", dl);
  }
  async function edit(config, table, row = {}) {
    const f = el("form", null, "form-grid");
    for (const [name, label, type = "text", options] of config.fields) {
      const item = field(name, label, row[name], type, options);
      const n = item.lastElementChild;
      if (["nombre", "detalle", "id_cliente"].includes(name)) n.required = true;
      if (name === "nombre") n.maxLength = 120;
      if (type === "number") n.min = "1";
      f.append(item);
    }
    if (table === "proyectos" || table === "solicitudes") {
      const select = el("select");
      select.name = "id_cliente";
      select.required = true;
      const initial = el("option", "Selecciona un cliente");
      initial.value = "";
      select.append(initial);
      let offset = 0;
      while (true) {
        const r = await list("clientes", "id,nombre", { page: offset++, sort: "nombre", ascending: true });
        for (const c of r.data) {
          const o = el("option", c.nombre);
          o.value = c.id;
          select.append(o);
        }
        if (offset * PAGE_SIZE >= r.count) break;
      }
      select.value = row.id_cliente || "";
      f.elements.id_cliente.replaceWith(select);
    }
    const submit = el("button", "Guardar");
    submit.type = "submit";
    const feedback = el("p", null, "feedback");
    feedback.setAttribute("role", "status");
    f.append(submit, feedback);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submit.disabled || !f.reportValidity()) return;
      submit.disabled = true;
      try {
        let payload = Object.fromEntries(new FormData(f));
        for (const [name, , ,] of config.fields) if (["id_categoria", "id_proyecto"].includes(name)) payload[name] = payload[name] ? Number(payload[name]) : null;
        if (table === "proyectos") {
          payload.visible_clientes = f.elements.visible_clientes.checked;
          payload = projectPayload(payload);
        } else if (payload.nombre) payload.nombre = requiredText(payload.nombre);
        if (payload.detalle) payload.detalle = requiredText(payload.detalle, 5e3);
        if (table === "solicitudes" && payload.estado === "convertida" && !payload.id_proyecto) throw Object.assign(new Error(), { userMessage: "Una solicitud convertida requiere un proyecto." });
        await save(table, payload, row.id);
        $("#record-dialog").close();
        await render();
        if (table === "proyectos") await onProjectsChanged();
      } catch (err) {
        notice(feedback, errorText(err), "error");
      } finally {
        submit.disabled = false;
      }
    });
    modal(row.id ? "Editar registro" : "Crear registro", f);
  }
  async function roleEditor(row) {
    const { data: { user } } = await db.auth.getUser();
    if (row.id === user?.id) {
      notice("#app-notice", "No puedes modificar tu propio rol.");
      return;
    }
    const { data } = await result(db.from("perfiles").select("rol").eq("id", row.id).single());
    const f = el("form");
    f.append(field("rol", "Rol", data.rol, "select", [["usuario", "Cliente"], ["admin", "Administrador"]]));
    const b = el("button", "Guardar rol");
    b.type = "submit";
    const feedback = el("p", null, "feedback");
    f.append(b, feedback);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (b.disabled) return;
      if (!confirm("\xBFConfirmas el cambio de permisos de esta cuenta?")) return;
      b.disabled = true;
      try {
        await save("perfiles", { rol: f.elements.rol.value }, row.id);
        $("#record-dialog").close();
        await render();
      } catch (err) {
        notice(feedback, errorText(err), "error");
      } finally {
        b.disabled = false;
      }
    });
    modal("Permisos de " + row.nombre, f);
  }
  async function dashboard(ticket) {
      const values = await Promise.all([count("perfiles"), count("clientes"), count("proyectos", { estado: "en_progreso" }), count("proyectos", { estado: "completado" }), count("solicitudes", { estado: "pendiente" }), count("mensajes")]);
    if (!active || ticket !== version) return;
    const grid = el("div", null, "metric-grid");
    ["Usuarios", "Clientes", "Proyectos activos", "Finalizados", "Solicitudes pendientes", "Mensajes"].forEach((name, i) => {
      const c = el("article");
      c.append(el("span", name), el("strong", values[i]));
      grid.append(c);
    });
    const f = el("form", null, "toolbar");
    const today = boliviaDate();
    f.append(field("desde", "Desde", today.slice(0, 8) + "01", "date"), field("hasta", "Hasta", today, "date"));
    const b = el("button", "Consultar periodo");
    b.type = "submit";
    f.append(b);
    const output = el("div");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      b.disabled = true;
      try {
        const range = period(f.elements.desde.value, f.elements.hasta.value);
        const counts = await Promise.all([count("proyectos", {}, range), count("proyectos", { estado: "en_progreso" }, range), count("proyectos", { estado: "completado" }, range), count("proyectos", { estado: "cancelado" }, range), count("proyectos", { estado: "completado", visible_clientes: true }, range)]);
        const rows = await result(db.from("proyectos").select("id,nombre,estado,created_at,clientes(nombre)").gte("created_at", range[0]).lt("created_at", range[1]).order("created_at", { ascending: false }).limit(50));
        output.replaceChildren(el("p", "Total: " + counts[0] + " \xB7 En progreso: " + counts[1] + " \xB7 Completados: " + counts[2] + " \xB7 Cancelados: " + counts[3] + " \xB7 Publicados: " + counts[4]));
        for (const p of rows.data) output.append(el("p", p.nombre + " \xB7 " + (statuses[p.estado] || p.estado) + " \xB7 " + (p.clientes?.nombre || "Cliente") + " \xB7 " + new Date(p.created_at).toLocaleDateString("es-BO", { timeZone: "America/La_Paz" })));
        if (counts[0] > 50) output.append(el("p", "Se muestran los 50 registros m\xE1s recientes; los totales incluyen todo el periodo."));
      } catch (err) {
        empty(output, errorText(err));
      } finally {
        b.disabled = false;
      }
    });
    root.replaceChildren(el("h2", "Resumen de actividad"), grid, el("h3", "Indicadores por periodo"), f, output);
  }
  $("#admin-nav").addEventListener("click", (e) => {
    const b = e.target.closest("[data-panel]");
    if (!b) return;
    current = b.dataset.panel;
    page = 0;
    search = "";
    sort = "recent";
    for (const n of $("#admin-nav").children) n.removeAttribute("aria-current");
    b.setAttribute("aria-current", "page");
    render();
  }, { signal: controller.signal });
  render();
  return { destroy() {
    active = false;
    version++;
    controller.abort();
  } };
}
export {
  mountAdmin
};
