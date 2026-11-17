import { db, result, list, PAGE_SIZE, save } from "./data.js";
import { $, el, notice, show, button, bindForm, empty, errorText } from "./ui.js";
import { requiredText, safeUrl, statuses } from "./validation.js";
let session = null, role = null, page = 0, generation = 0, projectRequest = 0, admin = null, lastIdentity;
let categories = new Map();
async function loadCategories() {
  const { data } = await result(db.from("categorias").select("id,nombre").order("nombre"));
  categories = new Map(data.map((category) => [String(category.id), category.nombre]));
  const select = $("#filtro-categoria");
  const selected = select.value;
  select.replaceChildren(el("option", "Todas las categorías"));
  select.firstChild.value = "all";
  for (const [id, name] of categories) {
    const option = el("option", name);
    option.value = id;
    select.append(option);
  }
  select.value = categories.has(selected) ? selected : "all";
}
async function refreshProjects() {
  await loadCategories();
  await projects();
}
async function projects() {
  const ticket = ++projectRequest;
  const currentRole = role;
  empty($("#lista-proyectos"), "Cargando proyectos\u2026");
  try {
    const filters = {};
    if (currentRole && $("#filtro-estado").value !== "all") filters.estado = $("#filtro-estado").value;
    if ($("#filtro-categoria").value !== "all") filters.id_categoria = Number($("#filtro-categoria").value);
    const columns = currentRole ? "id,nombre,descripcion,estado,id_categoria,url_demo,url_produccion,visible_clientes" : "id,nombre,id_categoria,url_produccion";
    const r = await list("proyectos", columns, { page, search: $("#buscar-proyectos").value, sort: $("#orden-proyectos").value === "name" ? "nombre" : "id", ascending: $("#orden-proyectos").value === "name", filters });
    if (ticket !== projectRequest) return;
    $("#lista-proyectos").replaceChildren(...r.data.map((p) => {
      const c = el("article", null, "project-card");
      if (p.id_categoria && categories.has(String(p.id_categoria))) c.append(el("span", categories.get(String(p.id_categoria)), "project-category"));
      c.append(el("h3", p.nombre));
      c.append(el("p", currentRole ? p.descripcion || "Sin descripci\xF3n registrada." : "Inicia sesi\xF3n para consultar los detalles."));
      if (currentRole) {
        c.append(el("p", statuses[p.estado], "badge"));
        for (const [k, label] of [["url_demo", "Ver avance"], ["url_produccion", "Abrir página web"]]) if (safeUrl(p[k])) {
          const a = el("a", label);
          a.href = safeUrl(p[k]);
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          c.append(a);
        }
      }
      if (!currentRole && safeUrl(p.url_produccion)) {
        const link = el("a", "Abrir página web ↗");
        link.href = safeUrl(p.url_produccion);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        c.append(link);
      }
      return c;
    }));
    if (!r.data.length) empty($("#lista-proyectos"), "No hay proyectos disponibles con estos filtros.");
    $("#proyectos-prev").disabled = page === 0;
    $("#proyectos-next").disabled = (page + 1) * PAGE_SIZE >= r.count;
    notice("#proyectos-page", "P\xE1gina " + (page + 1) + " \xB7 " + r.count + " proyectos");
  } catch (e) {
    if (ticket === projectRequest) empty($("#lista-proyectos"), errorText(e));
  }
}
async function loadClientMessages() {
  if (role !== "usuario" || !session) return;
  const userId = session.user.id;
  const root = $("#mensajes-cliente");
  empty(root, "Cargando mensajes…");
  try {
    const { data } = await result(db.from("mensajes").select("id,contenido,remitente,created_at").eq("id_usuario", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50));
    if (role !== "usuario" || session?.user?.id !== userId) return;
    root.replaceChildren();
    for (const message of data.reverse()) {
      const item = el("article", null, `message-bubble ${message.remitente === "admin" ? "message-admin" : "message-client"}`);
      item.append(el("span", message.remitente === "admin" ? "NOCTUA" : "Tú", "message-sender"), el("p", message.contenido), el("time", new Date(message.created_at).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "medium", timeStyle: "short" })));
      root.append(item);
    }
    if (!data.length) empty(root, "Aún no hay mensajes. Envíanos el primero.");
  } catch (error) {
    if (role === "usuario" && session?.user?.id === userId) empty(root, errorText(error));
  }
}
function render() {
  const isAdmin = role === "admin";
  document.body.classList.toggle("admin-mode", isAdmin);
  show("#acceso", !session);
  show("#area-cuenta", !!session && !isAdmin);
  show("#area-usuario", role === "usuario");
  show("#area-admin", role === "admin");
  show("#filtro-estado-label", !!role);
  notice("#estado-sesion", isAdmin ? "Administrador" : role === "usuario" ? "Cliente" : session ? "Cuenta sin rol" : "Visitante");
  notice("#alcance-proyectos", role ? "Proyectos publicados y registros autorizados para tu cuenta." : "Selecci\xF3n p\xFAblica de proyectos completados.");
  const contact = document.querySelector(".contact-section .button-link");
  contact.href = session ? "#area-cuenta" : "#acceso";
  contact.textContent = session ? "Ir a mi cuenta \u2197" : "Entrar o crear cuenta \u2197";
  let adminLogout = $("#btn-cerrar-sesion-admin");
  if (!adminLogout) {
    adminLogout = button("Cerrar sesión", signOut, "button-secondary");
    adminLogout.id = "btn-cerrar-sesion-admin";
    $(".header-actions").append(adminLogout);
  }
  adminLogout.hidden = !isAdmin;
}
async function refresh(next) {
  const ticket = ++generation;
  session = next;
  role = null;
  admin?.destroy();
  admin = null;
  $("#admin-content").replaceChildren();
  $("#client-content").replaceChildren();
  $("#mensajes-cliente").replaceChildren();
  $("#record-dialog").close();
  page = 0;
  render();
  try {
    if (session) {
      const { data } = await result(db.from("perfiles").select("rol").eq("id", session.user.id).maybeSingle());
      if (ticket !== generation) return;
      role = data?.rol || null;
      render();
      if (role) {
        try {
          const profile = await result(db.from("clientes").select("nombre,telefono").eq("id", session.user.id).maybeSingle());
          if (ticket !== generation) return;
          $("#perfil-nombre").value = profile.data?.nombre || "";
          $("#perfil-telefono").value = profile.data?.telefono || "";
        } catch (e) {
          notice("#app-notice", "Entraste, pero no se pudo cargar el perfil: " + errorText(e), "error");
        }
      }
    }
    if (ticket !== generation) return;
    render();
    if (role === "admin") {
      const m = await import("./admin.js");
      if (ticket === generation) admin = m.mountAdmin(refreshProjects);
    }
    if (role === "usuario") {
      const m = await import("./client.js");
      if (ticket === generation) await m.mountClient(session.user.id);
      if (ticket === generation) await loadClientMessages();
    }
    if (ticket !== generation) return;
    await refreshProjects();
  } catch (e) {
    if (ticket !== generation) return;
    render();
    notice("#app-notice", errorText(e), "error");
  }
}
bindForm("#form-iniciar-sesion", "#mensaje-sesion", async (f) => {
  const { error } = await db.auth.signInWithPassword({ email: $("#correo").value.trim(), password: $("#contrasena").value });
  if (error) {
    notice("#mensaje-sesion", error.code === "invalid_credentials" || error.message === "Invalid login credentials" ? "Correo electr\xF3nico o contrase\xF1a incorrectos." : error.status === 429 ? "Demasiados intentos. Espera antes de volver a intentarlo." : "No fue posible iniciar sesi\xF3n. Comprueba el correo de confirmaci\xF3n y tu conexi\xF3n.", "error");
    return;
  }
  f.reset();
  notice("#mensaje-sesion", "");
});
bindForm("#form-registrarse", "#mensaje-sesion", async (f) => {
  await result(db.auth.signUp({ email: $("#registro-correo").value.trim(), password: $("#registro-contrasena").value, options: { data: { nombre: requiredText($("#registro-nombre").value), telefono: requiredText($("#registro-telefono").value, 20) } } }));
  f.reset();
  notice("#mensaje-sesion", "Revisa tu correo para confirmar el acceso. Si ya tienes cuenta, inicia sesi\xF3n.");
});
bindForm("#form-recuperar", "#mensaje-recuperar", async (f) => {
  await result(db.auth.resetPasswordForEmail($("#recuperar-correo").value.trim(), { redirectTo: location.origin + location.pathname }));
  f.reset();
  notice("#mensaje-recuperar", "Si el correo corresponde a una cuenta, recibir\xE1s instrucciones para recuperar el acceso.");
});
bindForm("#form-perfil", "#mensaje-perfil", async () => {
  if (!session) return;
  await save("clientes", { nombre: requiredText($("#perfil-nombre").value), telefono: $("#perfil-telefono").value.trim().slice(0, 20) }, session.user.id);
  notice("#mensaje-perfil", "Perfil actualizado.");
});
bindForm("#form-cambiar-contrasena", "#mensaje-contrasena", async (f) => {
  if (!session) return;
  await result(db.auth.updateUser({ password: $("#nueva-contrasena").value }));
  f.reset();
  notice("#mensaje-contrasena", "Contrase\xF1a actualizada.");
});
bindForm("#form-mensaje", "#mensaje-envio", async (f) => {
  if (role !== "usuario") return;
  await result(db.from("mensajes").insert({ id_usuario: session.user.id, contenido: requiredText($("#campo-mensaje").value, 2e3), remitente: "cliente" }));
  f.reset();
  notice("#mensaje-envio", "Mensaje enviado.");
  await loadClientMessages();
});
$("#actualizar-mensajes").addEventListener("click", loadClientMessages);
async function signOut() {
  try {
    await result(db.auth.signOut());
  } catch (e) {
    notice("#app-notice", errorText(e), "error");
  }
}
$("#btn-cerrar-sesion").addEventListener("click", signOut);
$("#form-filtros-proyectos").addEventListener("submit", (e) => {
  e.preventDefault();
  page = 0;
  projects();
});
$("#proyectos-prev").addEventListener("click", () => {
  if (page > 0) {
    page--;
    projects();
  }
});
$("#proyectos-next").addEventListener("click", () => {
  page++;
  projects();
});
$("#catalogo-publico").replaceChildren(
  ...[
    ["Identidad visual", "Una presencia coherente para comunicar la esencia de tu negocio."],
    ["Diseño UI/UX", "Interfaces claras que ayudan a las personas a encontrar lo que necesitan."],
    ["Desarrollo web", "Sitios y experiencias digitales adaptados a tus objetivos."]
  ].map(([title, description]) => {
    const card = el("article", null, "catalog-card");
    card.append(el("h3", title), el("p", description));
    return card;
  })
);
const { data: { subscription } } = db.auth.onAuthStateChange((event, next) => {
  if (event === "PASSWORD_RECOVERY") {
    setTimeout(() => {
      notice("#mensaje-contrasena", "Establece tu nueva contrase\xF1a para recuperar el acceso.");
      $("#area-cuenta").scrollIntoView();
    }, 0);
  }
  const identity = next?.user?.id || null;
  if (event === "INITIAL_SESSION" || identity !== lastIdentity || event === "USER_UPDATED") {
    lastIdentity = identity;
    setTimeout(() => refresh(next), 0);
  }
});
window.addEventListener("pagehide", () => {
  subscription.unsubscribe();
  admin?.destroy();
}, { once: true });
db.auth.getSession().then(({ data, error }) => {
  if (error) throw error;
  if (lastIdentity === void 0) {
    lastIdentity = data.session?.user?.id || null;
    return refresh(data.session);
  }
}).catch((e) => {
  render();
  notice("#app-notice", errorText(e), "error");
});
setTimeout(() => {
  if (lastIdentity !== void 0) return;
  lastIdentity = null;
  refresh(null);
  notice("#app-notice", "La sesión tardó demasiado en responder. Puedes volver a iniciar sesión o recargar la página.", "error");
}, 8000);
