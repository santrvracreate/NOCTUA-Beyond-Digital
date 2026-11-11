import { test } from "node:test";
import assert from "node:assert/strict";
import { requiredText, safeUrl, projectPayload, period, boliviaDate } from "../js/validation.js";
test("rechaza texto vac\xEDo y excesivo", () => {
  assert.throws(() => requiredText("  "));
  assert.throws(() => requiredText("abcd", 3));
  assert.equal(requiredText(" hola "), "hola");
});
test("enlaces no pueden ejecutar scripts ni incluir credenciales", () => {
  for (const u of ["javascript:alert(1)", "data:text/html,hi", "https://user:pass@test.com"]) assert.equal(safeUrl(u), null);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
test("solo publica completados", () => {
  assert.throws(() => projectPayload({ nombre: "A", estado: "en_progreso", visible_clientes: true }));
  assert.equal(projectPayload({ nombre: "A", estado: "completado", visible_clientes: true }).estado, "completado");
});
test("periodo incluye \xFAltimo d\xEDa en Bolivia", () => {
  assert.deepEqual(period("2026-10-01", "2026-10-31"), ["2026-10-01T04:00:00.000Z", "2026-11-01T04:00:00.000Z"]);
  assert.throws(() => period("2026-11-01", "2026-10-01"));
});
test("fecha del reporte usa el día local de Bolivia", () => {
  assert.equal(boliviaDate(new Date("2026-11-03T02:00:00Z")), "2026-11-02");
  assert.equal(boliviaDate(new Date("2026-11-03T06:00:00Z")), "2026-11-03");
});
