import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sesión requerida." }, 401);

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: "Sesión inválida." }, 401);
    const { data: profile, error: roleError } = await caller.from("perfiles").select("rol").eq("id", user.id).single();
    if (roleError || profile?.rol !== "admin") return json({ error: "Solo un administrador puede gestionar cuentas." }, 403);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();

    if (body.action === "list") {
      const page = Math.max(1, Number(body.page) || 1);
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
      if (error) throw error;
      const ids = data.users.map((item) => item.id);
      const { data: profiles, error: profilesError } = await admin.from("perfiles").select("id,rol,created_at").in("id", ids);
      if (profilesError) throw profilesError;
      const { data: clients, error: clientsError } = await admin.from("clientes").select("id,nombre,telefono").in("id", ids);
      if (clientsError) throw clientsError;
      const profileMap = new Map((profiles || []).map((item) => [item.id, item]));
      const clientMap = new Map((clients || []).map((item) => [item.id, item]));
      return json({ users: data.users.map((item) => ({ id: item.id, email: item.email, email_confirmed: !!item.email_confirmed_at, ...profileMap.get(item.id), ...clientMap.get(item.id) })) });
    }

    if (body.action === "invite") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      if (!/^\S+@\S+\.\S+$/.test(email) || !name || name.length > 120 || phone.length > 20) return json({ error: "Revisa el correo, nombre y teléfono." }, 400);
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { nombre: name, telefono: phone } });
      if (error) throw error;
      return json({ user: { id: data.user.id, email: data.user.email }, message: "Invitación enviada por correo." });
    }

    if (body.action === "reset_password") {
      const targetId = String(body.user_id || "");
      const { data: target, error } = await admin.auth.admin.getUserById(targetId);
      if (error || !target.user?.email) return json({ error: "No se encontró el correo de esta cuenta." }, 404);
      const { error: resetError } = await caller.auth.resetPasswordForEmail(target.user.email, { redirectTo: Deno.env.get("APP_REDIRECT_URL") || undefined });
      if (resetError) throw resetError;
      return json({ message: "Enviamos instrucciones para cambiar la contraseña." });
    }

    if (body.action === "delete") {
      const targetId = String(body.user_id || "");
      if (!targetId || targetId === user.id) return json({ error: "No puedes eliminar tu propia cuenta." }, 400);
      const { data: targetProfile } = await admin.from("perfiles").select("rol").eq("id", targetId).maybeSingle();
      if (targetProfile?.rol === "admin") {
        const { count, error } = await admin.from("perfiles").select("id", { count: "exact", head: true }).eq("rol", "admin");
        if (error) throw error;
        if ((count || 0) <= 1) return json({ error: "No se puede eliminar al último administrador." }, 409);
      }
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return json({ message: "Cuenta eliminada." });
    }

    return json({ error: "Acción desconocida." }, 400);
  } catch (error) {
    console.error("admin-users", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo completar la operación." }, 500);
  }
});
