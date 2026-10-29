const $ = (selector) => document.querySelector(selector);
const state = { session: null, role: null, projects: [], clients: [] };
const statusLabels = {
  en_progreso: 'En progreso',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('noctua-theme-v2', dark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#050505' : '#e9eaec';
  $('#btn-tema').setAttribute('aria-pressed', String(dark));
  $('#btn-tema').setAttribute('aria-label', dark ? 'Cambiar a modo día' : 'Cambiar a modo noche');
  $('#btn-tema').innerHTML = dark ? '☀ <span>Modo día</span>' : '☾ <span>Modo noche</span>';
}

applyTheme(document.documentElement.dataset.theme);
$('#btn-tema').addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function show(selector, visible) {
  $(selector).hidden = !visible;
}

function setMessage(selector, text) {
  $(selector).textContent = text;
}

function setBusy(form, busy) {
  form.querySelector('button[type="submit"]').disabled = busy;
}

function showProjectNotice(text) {
  const notice = document.createElement('p');
  notice.className = 'empty-state';
  notice.textContent = text;
  $('#lista-proyectos').replaceChildren(notice);
}

function formatProjectDate(value) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDayStartAsIso(dateText, daysToAdd = 0) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day + daysToAdd).toISOString();
}

function setDefaultReportRange() {
  if ($('#resumen-desde').value || $('#resumen-hasta').value) return;
  const today = new Date();
  $('#resumen-desde').value = formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
  $('#resumen-hasta').value = formatDateInput(today);
}

function renderMode() {
  const loggedIn = Boolean(state.session);
  const isAdmin = state.role === 'admin';

  show('#acceso', !loggedIn);
  show('#area-cuenta', loggedIn);
  show('#area-usuario', state.role === 'usuario');
  show('#area-admin', isAdmin);

  setMessage('#estado-sesion',
    isAdmin ? 'Administrador' :
    state.role === 'usuario' ? 'Cliente registrado' :
    loggedIn ? 'Cuenta sin rol' : 'Visitante'
  );
  setMessage('#alcance-proyectos', isAdmin
    ? 'Todos los proyectos, incluidos los privados.'
    : state.role === 'usuario'
      ? 'Proyectos publicados y proyectos asignados a tu cuenta.'
      : 'Vista pública limitada. Regístrate para consultar los detalles.'
  );
  show('#panel-edicion', false);
}

function createProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';

  const title = document.createElement('h3');
  title.textContent = project.nombre;
  card.append(title);

  if (state.role === 'admin' || state.role === 'usuario') {
    const status = document.createElement('p');
    status.className = 'project-status';
    status.textContent = statusLabels[project.estado] || project.estado;
    const description = document.createElement('p');
    description.textContent = project.descripcion || 'Sin descripción registrada.';
    card.append(status, description);
  } else {
    const summary = document.createElement('p');
    summary.textContent = 'Inicia sesión para ver los detalles de este proyecto.';
    card.append(summary);
  }

  if (state.role === 'admin') {
    const visibility = document.createElement('p');
    visibility.className = 'project-visibility';
    visibility.textContent = project.visible_clientes && project.estado === 'completado'
      ? 'Publicado' : 'No visible al visitante';
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    for (const [label, className] of [['Editar', 'btn-editar'], ['Eliminar', 'btn-eliminar']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.dataset.id = project.id;
      button.textContent = label;
      actions.append(button);
    }
    card.append(visibility, actions);
  }

  return card;
}

async function loadProjects() {
  const canViewDetails = state.role === 'admin' || state.role === 'usuario';
  showProjectNotice('Cargando proyectos...');
  const columns = canViewDetails
    ? 'id,nombre,descripcion,estado,visible_clientes'
    : 'id,nombre';
  const { data, error } = await supabaseClient.from('proyectos')
    .select(columns)
    .order('id', { ascending: false });

  if (error) {
    console.error('Error al cargar proyectos:', error);
    showProjectNotice('No se pudieron cargar los proyectos.');
    return;
  }

  state.projects = data || [];
  if (!state.projects.length) {
    const emptyMessage = state.role === 'admin'
      ? 'Todavía no hay proyectos registrados.'
      : state.role === 'usuario'
        ? 'No hay proyectos disponibles para esta cuenta.'
        : 'Todavía no hay proyectos terminados y publicados.';
    showProjectNotice(emptyMessage);
    return;
  }

  $('#lista-proyectos').replaceChildren(...state.projects.map(createProjectCard));
}
async function loadClientsAndRoles() {
  const [clientsResult, profilesResult] = await Promise.all([
    supabaseClient.from('clientes').select('id,nombre,telefono').order('nombre'),
    supabaseClient.from('perfiles').select('id,rol').order('created_at')
  ]);
  if (clientsResult.error || profilesResult.error) {
    console.error(clientsResult.error || profilesResult.error);
    $('#mensaje-roles').textContent = 'No se pudieron cargar los usuarios.';
    return;
  }
  state.clients = clientsResult.data;
  const clientById = new Map(state.clients.map((client) => [client.id, client]));
  const clientSelect = $('#campo-cliente');
  clientSelect.replaceChildren();
  for (const client of state.clients) {
    const option = document.createElement('option');
    option.value = client.id;
    option.textContent = client.nombre;
    clientSelect.append(option);
  }
  const list = $('#lista-usuarios');
  list.replaceChildren();
  for (const profile of profilesResult.data) {
    const line = document.createElement('div');
    const client = clientById.get(profile.id);
    const name = document.createElement('span');
    name.textContent = client?.nombre || 'Usuario sin nombre';
    const phone = document.createElement('span');
    phone.textContent = client?.telefono || 'Sin teléfono';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Rol de ' + name.textContent);
    for (const [role, label] of [['usuario', 'Cliente'], ['admin', 'Administrador']]) {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = label;
      select.append(option);
    }
    select.value = profile.rol;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Guardar rol';
    button.dataset.id = profile.id;
    button.className = 'btn-rol';
    if (profile.id === state.session.user.id) {
      button.disabled = true;
      select.disabled = true;
    }
    line.append(name, phone, select, button);
    list.append(line);
  }
}
async function loadMessages() {
  const { data, error } = await supabaseClient.from('mensajes')
    .select('id,id_usuario,contenido,created_at').order('created_at', { ascending: false });
  const list = $('#lista-mensajes');
  list.replaceChildren();
  if (error) {
    console.error(error);
    list.textContent = 'No se pudieron cargar los mensajes.';
    return;
  }
  if (!data.length) {
    list.textContent = 'No hay mensajes.';
    return;
  }
  const names = new Map(state.clients.map((client) => [client.id, client.nombre]));
  for (const item of data) {
    const article = document.createElement('article');
    const title = document.createElement('strong');
    title.textContent = names.get(item.id_usuario) || 'Usuario';
    const body = document.createElement('p');
    body.textContent = item.contenido;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Eliminar mensaje';
    button.className = 'btn-borrar-mensaje';
    button.dataset.id = item.id;
    article.append(title, body, button);
    list.append(article);
  }
}

function renderProjectSummary(projects) {
  const projectList = $('#lista-resumen-proyectos');
  const statusList = $('#resumen-por-estado');
  const statusTotals = projects.reduce((totals, project) => {
    totals[project.estado] = (totals[project.estado] || 0) + 1;
    return totals;
  }, {});

  projectList.replaceChildren();
  statusList.replaceChildren();
  $('#total-proyectos-periodo').textContent = String(projects.length);
  $('#total-en-progreso').textContent = String(statusTotals.en_progreso || 0);
  $('#total-completados').textContent = String(statusTotals.completado || 0);
  $('#total-publicados').textContent = String(projects.filter((project) =>
    project.visible_clientes && project.estado === 'completado'
  ).length);

  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state compact-empty-state';
    empty.textContent = 'No se registraron proyectos en este periodo.';
    projectList.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'summary-list';
    for (const project of projects) {
      const item = document.createElement('li');
      const client = Array.isArray(project.clientes) ? project.clientes[0] : project.clientes;
      const name = document.createElement('strong');
      name.textContent = project.nombre;
      const detail = document.createElement('span');
      detail.textContent = `${statusLabels[project.estado] || project.estado} - ${client?.nombre || 'Cliente sin nombre'} - ${formatProjectDate(project.created_at)}`;
      item.append(name, detail);
      list.append(item);
    }
    projectList.append(list);
  }

  for (const status of Object.keys(statusLabels)) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = statusLabels[status];
    const total = document.createElement('strong');
    total.textContent = String(statusTotals[status] || 0);
    item.append(label, total);
    statusList.append(item);
  }
  show('#resultado-resumen', true);
}

async function loadProjectSummary() {
  if (state.role !== 'admin') return;
  const desde = $('#resumen-desde').value;
  const hasta = $('#resumen-hasta').value;
  if (!desde || !hasta) {
    setMessage('#mensaje-resumen', 'Selecciona ambas fechas para consultar el resumen.');
    return;
  }
  if (desde > hasta) {
    setMessage('#mensaje-resumen', 'La fecha inicial no puede ser posterior a la fecha final.');
    return;
  }

  setMessage('#mensaje-resumen', 'Actualizando indicadores...');
  const { data, error } = await supabaseClient.from('proyectos')
    .select('id,nombre,estado,visible_clientes,created_at,clientes(nombre)')
    .gte('created_at', localDayStartAsIso(desde))
    .lt('created_at', localDayStartAsIso(hasta, 1))
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error al consultar el resumen:', error);
    setMessage('#mensaje-resumen', 'No se pudieron actualizar los indicadores.');
    show('#resultado-resumen', false);
    return;
  }
  renderProjectSummary(data || []);
  setMessage('#mensaje-resumen', 'Indicadores actualizados.');
}
async function refreshSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  state.session = error ? null : session;
  state.role = null;
  if (state.session) {
    const result = await supabaseClient.from('perfiles').select('rol')
      .eq('id', state.session.user.id).maybeSingle();
    if (result.error) console.error(result.error);
    state.role = result.data?.rol || null;
  }
  renderMode();
  if (state.role === 'admin') setDefaultReportRange();
  await loadProjects();
  if (state.role === 'admin') {
    await loadClientsAndRoles();
    await loadMessages();
  }
}

$('#form-iniciar-sesion').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setBusy(form, true);
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: $('#correo').value.trim(),
      password: $('#contrasena').value
    });
    if (error) {
      setMessage('#mensaje-sesion', error.code === 'email_not_confirmed'
        ? 'Confirma tu correo antes de ingresar.'
        : 'No fue posible iniciar sesión. Revisa tu correo y contraseña.');
      return;
    }
    form.reset();
    setMessage('#mensaje-sesion', '');
    await refreshSession();
  } catch (error) {
    console.error('Error de conexión al iniciar sesión:', error);
    setMessage('#mensaje-sesion', 'No hay conexión con el servicio. Inténtalo de nuevo.');
  } finally {
    setBusy(form, false);
  }
});

$('#form-registrarse').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  setBusy(form, true);
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: $('#registro-correo').value.trim(),
      password: $('#registro-contrasena').value,
      options: {
        data: {
          nombre: $('#registro-nombre').value.trim(),
          telefono: $('#registro-telefono').value.trim()
        }
      }
    });
    if (error) {
      setMessage('#mensaje-sesion', 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.');
      return;
    }
    form.reset();
    setMessage('#mensaje-sesion', data.session
      ? 'Cuenta creada correctamente.'
      : 'Revisa tu correo para confirmar la cuenta. Si ya existe, inicia sesión.');
    if (data.session) await refreshSession();
  } catch (error) {
    console.error('Error de conexión al registrar la cuenta:', error);
    setMessage('#mensaje-sesion', 'No hay conexión con el servicio. Inténtalo de nuevo.');
  } finally {
    setBusy(form, false);
  }
});
$('#btn-cerrar-sesion').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    setMessage('#mensaje-contrasena', 'No se pudo cerrar sesión.');
    return;
  }
  state.session = null;
  state.role = null;
  state.clients = [];
  setMessage('#mensaje-contrasena', '');
  setMessage('#mensaje-envio', '');
  await refreshSession();
});
$('#form-cambiar-contrasena').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.session) return;
  const form = event.currentTarget;
  const { error } = await supabaseClient.auth.updateUser({ password: $('#nueva-contrasena').value });
  setMessage('#mensaje-contrasena', error
    ? 'No se pudo cambiar la contraseña.'
    : 'Contraseña cambiada correctamente.');
  if (!error) form.reset();
});

$('#form-mensaje').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.role !== 'usuario') return;
  const form = event.currentTarget;
  const contenido = $('#campo-mensaje').value.trim();
  if (!contenido) return;
  const { error } = await supabaseClient.from('mensajes').insert({ id_usuario: state.session.user.id, contenido });
  setMessage('#mensaje-envio', error ? 'No se pudo enviar el mensaje.' : 'Mensaje enviado.');
  if (error) console.error(error);
  else form.reset();
});

function projectFields(prefix) {
  return {
    nombre: $('#'+prefix+'nombre').value.trim(),
    descripcion: $('#'+prefix+'descripcion').value.trim() || null,
    estado: $('#'+prefix+'estado').value,
    visible_clientes: $('#'+prefix+'visible').checked
  };
}

function canSaveProject(project) {
  if (!project.nombre) {
    setMessage('#mensaje-proyecto', 'Escribe un nombre para el proyecto.');
    return false;
  }
  if (project.visible_clientes && project.estado !== 'completado') {
    setMessage('#mensaje-proyecto', 'Para publicarlo, primero marca el proyecto como completado.');
    return false;
  }
  return true;
}

$('#form-proyecto').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.role !== 'admin') return;
  const form = event.currentTarget;
  const payload = {
    id_cliente: $('#campo-cliente').value,
    ...projectFields('campo-')
  };
  if (!payload.id_cliente || !canSaveProject(payload)) return;
  const { error } = await supabaseClient.from('proyectos').insert(payload);
  if (error) {
    console.error(error);
    setMessage('#mensaje-proyecto', 'No se pudo registrar el proyecto.');
    return;
  }
  setMessage('#mensaje-proyecto', 'Proyecto registrado. El ID se asignó automáticamente.');
  form.reset();
  await loadProjects();
  if ($('#resultado-resumen').hidden === false) await loadProjectSummary();
});

$('#form-resumen-proyectos').addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadProjectSummary();
});

$('#lista-proyectos').addEventListener('click', async (event) => {
  if (state.role !== 'admin' || !(event.target instanceof HTMLButtonElement)) return;
  const id = Number(event.target.dataset.id);
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;
  if (event.target.classList.contains('btn-editar')) {
    $('#editar-id').value = project.id;
    $('#editar-nombre').value = project.nombre;
    $('#editar-descripcion').value = project.descripcion || '';
    $('#editar-estado').value = project.estado;
    $('#editar-visible').checked = project.visible_clientes;
    show('#panel-edicion', true);
  } else if (event.target.classList.contains('btn-eliminar')) {
    if (!window.confirm('¿Eliminar el proyecto ' + project.nombre + '?')) return;
    const { data: deleted, error } = await supabaseClient.from('proyectos').delete().eq('id', id).select('id');
    if (error) {
      console.error(error);
      setMessage('#mensaje-proyecto', 'No se pudo eliminar.');
      return;
    }
    if (!deleted?.length) {
      setMessage('#mensaje-proyecto', 'El proyecto no se eliminó. Comprueba tus permisos o actualiza la página.');
      return;
    }
    setMessage('#mensaje-proyecto', 'Proyecto eliminado.');
    await loadProjects();
    if ($('#resultado-resumen').hidden === false) await loadProjectSummary();
  }
});

$('#form-editar-proyecto').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.role !== 'admin') return;
  const payload = projectFields('editar-');
  if (!canSaveProject(payload)) return;
  const { data: updated, error } = await supabaseClient.from('proyectos')
    .update(payload)
    .eq('id', Number($('#editar-id').value)).select('id');
  if (error) {
    console.error(error);
    setMessage('#mensaje-proyecto', 'No se pudo guardar.');
    return;
  }
  if (!updated?.length) {
    setMessage('#mensaje-proyecto', 'No se guardaron cambios. Comprueba tus permisos o actualiza la página.');
    return;
  }
  show('#panel-edicion', false);
  setMessage('#mensaje-proyecto', 'Proyecto actualizado.');
  await loadProjects();
  if ($('#resultado-resumen').hidden === false) await loadProjectSummary();
});
$('#btn-cancelar-edicion').addEventListener('click', () => show('#panel-edicion', false));
$('#lista-usuarios').addEventListener('click', async (event) => {
  if (state.role !== 'admin' || !event.target.classList.contains('btn-rol')) return;
  const id = event.target.dataset.id; if (id === state.session.user.id) return;
  const role = event.target.parentElement.querySelector('select').value;
  const { error } = await supabaseClient.from('perfiles').update({ rol: role }).eq('id', id);
  $('#mensaje-roles').textContent = error ? 'No se pudo actualizar el rol.' : 'Rol actualizado.';
  if (error) console.error(error); else await loadClientsAndRoles();
});
$('#lista-mensajes').addEventListener('click', async (event) => {
  if (state.role !== 'admin' || !event.target.classList.contains('btn-borrar-mensaje')) return;
  if (!window.confirm('¿Eliminar este mensaje?')) return;
  const { error } = await supabaseClient.from('mensajes').delete().eq('id', Number(event.target.dataset.id));
  if (error) console.error(error); else await loadMessages();
});
supabaseClient.auth.onAuthStateChange(() => setTimeout(refreshSession, 0));
refreshSession();
