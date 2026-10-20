const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function getProductos() {
  const res = await fetch(`${BASE_URL}/productos`);
  if (!res.ok) throw new Error('Error al obtener productos');
  return await res.json();
}

export async function crearProducto(prodData) {
  const res = await fetch(`${BASE_URL}/productos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(prodData)
  });
  if (!res.ok) throw new Error('Error al crear producto');
  return await res.json();
}

export async function actualizarProducto(id, prodData) {
  const res = await fetch(`${BASE_URL}/productos/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(prodData)
  });
  if (!res.ok) throw new Error('Error al actualizar producto');
  return await res.json();
}

export async function eliminarProducto(id) {
  const res = await fetch(`${BASE_URL}/productos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al eliminar producto');
  return await res.json();
}

export async function subirImagenProducto(file) {
  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`${BASE_URL}/productos/subir-imagen`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Error al subir imagen');
  return await res.json();
}

export async function loginApi(credentials) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Credenciales inválidas' }));
    throw new Error(err.detail || 'Error al iniciar sesión');
  }
  return await res.json();
}

export async function registerApi(userData) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error en el registro' }));
    throw new Error(err.detail || 'Error en el registro');
  }
  return await res.json();
}

export async function getPerfilApi() {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('No autenticado');
  return await res.json();
}

export async function crearPedidoApi(items) {
  const payload = {
    items: items.map(i => ({ producto_id: i.id, cantidad: i.cantidad }))
  };
  const res = await fetch(`${BASE_URL}/pedidos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al procesar pedido' }));
    throw new Error(err.detail || 'Error al procesar pedido');
  }
  return await res.json();
}

export async function getMisPedidosApi() {
  const res = await fetch(`${BASE_URL}/pedidos`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al cargar pedidos');
  return await res.json();
}

export async function getTodosLosPedidosAdminApi() {
  const res = await fetch(`${BASE_URL}/pedidos/todos`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al cargar todos los pedidos');
  return await res.json();
}

export async function getUsuariosAdminApi() {
  const res = await fetch(`${BASE_URL}/usuarios`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al cargar usuarios');
  return await res.json();
}

export async function revocarPedidoApi(pedidoId) {
  const res = await fetch(`${BASE_URL}/pedidos/${pedidoId}/revocar`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Error al revocar compra');
  return await res.json();
}

export async function arrepentimientoPublicoApi(pedidoId, email) {
  const res = await fetch(`${BASE_URL}/pedidos/arrepentimiento-publico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido_id: parseInt(pedidoId), email })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error en arrepentimiento' }));
    throw new Error(err.detail || 'Error en arrepentimiento público');
  }
  return await res.json();
}