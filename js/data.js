import { supabaseClient as db } from "./supabase-client.js";
const PAGE_SIZE = 12;
async function result(query) {
  const r = await query;
  if (r.error) throw r.error;
  return r;
}
async function list(table, columns, { page = 0, search = "", searchColumn = "nombre", sort = "id", ascending = false, filters = {} } = {}) {
  let q = db.from(table).select(columns, { count: "exact" });
  if (search) q = q.ilike(searchColumn, "%" + search.replace(/[%_\\]/g, "") + "%");
  for (const [key, value] of Object.entries(filters)) q = q.eq(key, value);
  q = q.order(sort, { ascending });
  if (sort !== "id") q = q.order("id", { ascending: false });
  return result(q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1));
}
async function save(table, payload, id) {
  let q = id ? db.from(table).update(payload).eq("id", id) : db.from(table).insert(payload);
  const r = await result(q.select("id"));
  if (!r.data?.length) throw Object.assign(new Error(), { userMessage: "No se guard\xF3 el registro. Comprueba tus permisos." });
  return r.data[0];
}
async function remove(table, id) {
  const r = await result(db.from(table).delete().eq("id", id).select("id"));
  if (!r.data?.length) throw Object.assign(new Error(), { userMessage: "No se elimin\xF3 el registro. Comprueba tus permisos." });
}
async function count(table, filters = {}, range) {
  let q = db.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  if (range) q = q.gte("created_at", range[0]).lt("created_at", range[1]);
  return (await result(q)).count;
}
export {
  PAGE_SIZE,
  count,
  db,
  list,
  remove,
  result,
  save
};
