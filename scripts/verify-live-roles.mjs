import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
import { supabaseClient } from "../js/supabase-client.js";

const ref = new URL(supabaseClient.supabaseUrl).hostname.split(".")[0];
const url = supabaseClient.supabaseUrl;
const anonKey = supabaseClient.supabaseKey;
const cli = resolve("node_modules/supabase/dist/supabase.js");
const raw = execFileSync(process.execPath, [cli, "projects", "api-keys", "--project-ref", ref, "--output", "json"], { encoding: "utf8" });
const parsed = JSON.parse(raw);
const keys = Array.isArray(parsed) ? parsed : parsed.data || parsed.keys || [];
const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
assert.ok(serviceKey, "La CLI no devolvió una clave de servicio; se requiere acceso administrativo al proyecto.");

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const anon = createClient(url, anonKey, options);
const createdUsers = [];
const createdProjects = [];
const createdMessages = [];
const createdRequests = [];
const suffix = randomBytes(8).toString("hex");

function checked(response, label) {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data;
}

async function makeAccount(kind) {
  const email = `noctua-${kind}-${suffix}@example.invalid`;
  const password = randomBytes(24).toString("base64url") + "A1!";
  const user = checked(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre: `Prueba ${kind}`, telefono: "00000000" } }), `crear ${kind}`).user;
  createdUsers.push(user.id);
  if (kind === "admin") checked(await service.from("perfiles").update({ rol: "admin" }).eq("id", user.id).select("id"), "asignar rol admin");
  const client = createClient(url, anonKey, options);
  checked(await client.auth.signInWithPassword({ email, password }), `iniciar sesión ${kind}`);
  return { id: user.id, client, email, password };
}

async function verifyBrowser(admin, customer) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  try {
    const customerPage = await browser.newPage();
    customerPage.on("pageerror", (error) => errors.push(error.message));
    await customerPage.goto(process.env.NOCTUA_BASE_URL);
    await customerPage.locator("#correo").fill(customer.email);
    await customerPage.locator("#contrasena").fill(customer.password);
    await customerPage.locator("#form-iniciar-sesion button").click();
    await expect(customerPage.locator("#area-usuario")).toBeVisible({ timeout: 15000 });
    await expect(customerPage.locator("#client-content")).toContainText("Mis solicitudes");
    await expect(customerPage.locator("#lista-proyectos")).toContainText(`Verificación editada ${suffix}`);

    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.NOCTUA_BASE_URL);
    await page.locator("#correo").fill(admin.email);
    await page.locator("#contrasena").fill(admin.password);
    await page.locator("#form-iniciar-sesion button").click();
    await expect(page.locator("#area-admin")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Consultar periodo" }).click();
    await expect(page.locator("#admin-content")).toContainText(`Verificación editada ${suffix}`);
    await page.locator("#admin-nav [data-panel=proyectos]").click();
    const search = page.locator("#admin-content input[name=search]");
    await search.fill(`Verificación editada ${suffix}`);
    await page.getByRole("button", { name: "Filtrar" }).click();
    const row = page.locator("#admin-content tbody tr").filter({ hasText: `Verificación editada ${suffix}` });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: "Editar" }).click();
    await page.locator("#record-dialog input[name=nombre]").fill(`Verificación UI ${suffix}`);
    await page.locator("#record-dialog button[type=submit]").click();
    await expect(page.locator("#record-dialog")).toBeHidden();
    await search.fill(`Verificación UI ${suffix}`);
    await page.getByRole("button", { name: "Filtrar" }).click();
    const updatedRow = page.locator("#admin-content tbody tr").filter({ hasText: `Verificación UI ${suffix}` });
    await expect(updatedRow).toHaveCount(1);
    page.once("dialog", (dialog) => dialog.accept());
    await updatedRow.getByRole("button", { name: "Eliminar" }).click();
    await expect(updatedRow).toHaveCount(0);
    assert.equal(errors.length, 0, `Errores JavaScript: ${errors.join("; ")}`);
  } finally {
    await browser.close();
  }
}

try {
  const admin = await makeAccount("admin");
  const customer = await makeAccount("cliente");
  const adminRole = checked(await admin.client.from("perfiles").select("rol").eq("id", admin.id).single(), "rol admin");
  const customerRole = checked(await customer.client.from("perfiles").select("rol").eq("id", customer.id).single(), "rol cliente");
  assert.equal(adminRole.rol, "admin");
  assert.equal(customerRole.rol, "usuario");

  const project = checked(await admin.client.from("proyectos").insert({ id_cliente: customer.id, nombre: `Verificación ${suffix}`, descripcion: "Proyecto temporal de prueba", estado: "en_progreso", visible_clientes: false }).select("id").single(), "crear proyecto");
  createdProjects.push(project.id);
  assert.equal(checked(await customer.client.from("proyectos").select("id").eq("id", project.id), "ver proyecto propio").length, 1);
  assert.equal(checked(await anon.from("proyectos").select("id").eq("id", project.id), "ver proyecto público").length, 0);

  await customer.client.from("proyectos").delete().eq("id", project.id);
  assert.equal(checked(await service.from("proyectos").select("id").eq("id", project.id), "comprobar borrado denegado").length, 1);
  assert.equal(checked(await admin.client.from("proyectos").update({ nombre: `Verificación editada ${suffix}` }).eq("id", project.id).select("id"), "editar proyecto").length, 1);

  const message = checked(await customer.client.from("mensajes").insert({ id_usuario: customer.id, contenido: `Mensaje temporal ${suffix}` }).select("id").single(), "enviar mensaje");
  createdMessages.push(message.id);
  assert.equal(checked(await admin.client.from("mensajes").select("id").eq("id", message.id), "leer mensaje admin").length, 1);

  const otherProject = checked(await admin.client.from("proyectos").insert({ id_cliente: admin.id, nombre: `Proyecto ajeno ${suffix}`, estado: "en_progreso", visible_clientes: false }).select("id").single(), "crear proyecto ajeno");
  createdProjects.push(otherProject.id);
  const forbiddenRequest = await customer.client.from("solicitudes").insert({ id_cliente: customer.id, id_proyecto: otherProject.id, detalle: `Solicitud temporal ${suffix}`, estado: "pendiente" }).select("id");
  if (forbiddenRequest.data?.length) createdRequests.push(forbiddenRequest.data[0].id);
  assert.ok(forbiddenRequest.error || !forbiddenRequest.data?.length, "Un cliente pudo vincular una solicitud con un proyecto ajeno.");

  const ownRoleChange = await admin.client.from("perfiles").update({ rol: "usuario" }).eq("id", admin.id).select("id");
  if (!ownRoleChange.error && ownRoleChange.data?.length) checked(await service.from("perfiles").update({ rol: "admin" }).eq("id", admin.id), "restaurar rol");
  assert.ok(ownRoleChange.error || !ownRoleChange.data?.length, "Un administrador pudo cambiar su propio rol.");

  if (process.env.NOCTUA_BASE_URL) {
    await verifyBrowser(admin, customer);
    assert.equal(checked(await service.from("proyectos").select("id").eq("id", project.id), "verificar borrado en interfaz").length, 0);
  } else {
    assert.equal(checked(await admin.client.from("proyectos").delete().eq("id", project.id).select("id"), "eliminar proyecto admin").length, 1);
  }
  createdProjects.splice(createdProjects.indexOf(project.id), 1);
} finally {
  for (const id of createdRequests) checked(await service.from("solicitudes").delete().eq("id", id), "limpiar solicitud");
  for (const id of createdMessages) checked(await service.from("mensajes").delete().eq("id", id), "limpiar mensaje");
  for (const id of createdProjects) checked(await service.from("proyectos").delete().eq("id", id), "limpiar proyecto");
  for (const id of createdUsers.reverse()) checked(await service.auth.admin.deleteUser(id), "limpiar cuenta");
  for (const id of createdProjects) assert.equal(checked(await service.from("proyectos").select("id").eq("id", id), "verificar limpieza de proyectos").length, 0);
  for (const id of createdUsers) {
    const { data, error } = await service.auth.admin.getUserById(id);
    assert.ok(error || !data?.user, "Una cuenta temporal quedó en Supabase.");
  }
}
console.log("OK: sesiones reales, roles, CRUD, mensajes, restricciones RLS, interfaz y limpieza de datos temporales.");
