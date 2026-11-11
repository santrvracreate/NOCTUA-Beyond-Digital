import {test,expect} from '@playwright/test';
test('visitante: diseño fijo, búsqueda, responsive y error de login',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/**',async route=>{expect(route.request().method()).toBe('GET');await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'*/0','access-control-expose-headers':'content-range'},body:'[]'});});
  await page.route('**/auth/v1/token*',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'invalid_credentials',message:'Invalid login credentials'})}));
  await page.goto('/');await expect(page.locator('#acceso')).toBeVisible();await expect(page.locator('#area-admin')).toBeHidden();await expect(page.locator('#btn-tema')).toHaveCount(0);
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
  await page.locator('#buscar-proyectos').fill('no existe');await page.locator('#form-filtros-proyectos button').click();await expect(page.locator('#lista-proyectos')).toContainText('No hay proyectos');
  await page.locator('#correo').fill('test@example.com');await page.locator('#contrasena').fill('incorrecta');await page.locator('#form-iniciar-sesion button').click();await expect(page.locator('#mensaje-sesion')).toHaveText('Correo electrónico o contraseña incorrectos.');
  await page.screenshot({path:'.test-output/noctua-claro.png',fullPage:true});expect(errors).toEqual([]);
});
