const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Error ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

export const api = {
  categorias:    ()                 => request('/api/categorias'),
  insumos:       ()                 => request('/api/insumos'),

  productos:     ({ soloDisponibles = true } = {}) =>
    request(`/api/productos?solo_disponibles=${soloDisponibles}`),

  recetas:       ({ activa = true } = {}) =>
    request(`/api/recetas?activa=${activa}`),
  recetaDetalle: (id)               => request(`/api/recetas/${id}`),
  crearReceta:   (payload)          => request('/api/recetas',         { method: 'POST',   body: payload }),
  editarReceta:  (id, payload)      => request(`/api/recetas/${id}`,   { method: 'PUT',    body: payload }),
  borrarReceta:  (id)               => request(`/api/recetas/${id}`,   { method: 'DELETE' }),

  registrarVenta: (payload)         => request('/api/ventas',          { method: 'POST',   body: payload }),
}
