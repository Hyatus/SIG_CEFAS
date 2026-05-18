import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Clock, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function manana() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function diasParaVencer(fechaVencimiento) {
  const hoyMs = new Date().setHours(0, 0, 0, 0)
  const venceMs = new Date(fechaVencimiento + 'T00:00:00').getTime()
  return Math.ceil((venceMs - hoyMs) / 86400000)
}

export default function ModuloProduccion({ onToast }) {
  const [productos, setProductos]   = useState([])
  const [lotes, setLotes]           = useState([])
  const [alertas, setAlertas]       = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]             = useState({
    producto_id:       '',
    cantidad:          '',
    fecha_produccion:  hoy(),
    fecha_vencimiento: manana(),
  })

  const cargarDatos = useCallback(async () => {
    try {
      const [prods, lts, alts] = await Promise.all([
        api.productos({ soloDisponibles: false }),
        api.lotes({ estado: 'activo' }),
        api.lotesProximosAVencer(3),
      ])
      setProductos(prods)
      setLotes(lts)
      setAlertas(alts)
    } catch (e) {
      onToast(e.message, 'error')
    }
  }, [onToast])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.registrarLote({
        producto_id:       parseInt(form.producto_id),
        cantidad:          parseInt(form.cantidad),
        fecha_produccion:  form.fecha_produccion,
        fecha_vencimiento: form.fecha_vencimiento,
      })
      onToast('Lote registrado correctamente')
      setForm(f => ({ ...f, producto_id: '', cantidad: '' }))
      cargarDatos()
    } catch (e) {
      onToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const darDeBaja = async (loteId, nombreProducto, cantidad) => {
    if (!window.confirm(`¿Dar de baja el lote de "${nombreProducto}" (${cantidad} unidades)?\nEsta acción no se puede deshacer.`)) return
    try {
      const r = await api.darDeBajaLote(loteId)
      onToast(`${r.cantidad_descartada} unidades dadas de baja`, 'error')
      cargarDatos()
    } catch (e) {
      onToast(e.message, 'error')
    }
  }

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-900 font-heading">Producción</h1>
        <p className="text-amber-700 text-sm mt-0.5">
          Registra lotes de producción y controla vencimientos (FEFO)
        </p>
      </div>

      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <h2 className="font-semibold text-red-800 text-sm">
              Vencen en los próximos 3 días ({alertas.length})
            </h2>
          </div>
          <div className="space-y-2">
            {alertas.map(a => {
              const dias = Number(a.dias_restantes)
              const vencido = dias <= 0
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg
                    ${vencido ? 'bg-red-100 text-red-800' : 'bg-orange-50 text-orange-800'}`}
                >
                  <span className="font-medium">{a.producto_nombre}</span>
                  <span className="text-xs font-medium">
                    {a.cantidad_disponible} uds ·{' '}
                    {vencido ? '¡Vence hoy!' : `${dias} día(s)`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
          <h2 className="font-semibold text-amber-900 mb-4 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Registrar lote de producción
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-amber-800 mb-1">Producto</label>
              <select
                value={form.producto_id}
                onChange={setField('producto_id')}
                required
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-amber-50
                           focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Seleccionar producto...</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-800 mb-1">
                Cantidad producida (unidades)
              </label>
              <input
                type="number"
                min="1"
                value={form.cantidad}
                onChange={setField('cantidad')}
                required
                placeholder="Ej: 50"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-amber-50
                           focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Fecha de producción
                </label>
                <input
                  type="date"
                  value={form.fecha_produccion}
                  onChange={setField('fecha_produccion')}
                  required
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-amber-50
                             focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-800 mb-1">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={setField('fecha_vencimiento')}
                  min={form.fecha_produccion}
                  required
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-amber-50
                             focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50
                         text-white font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              {submitting ? 'Registrando...' : 'Registrar lote'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
          <h2 className="font-semibold text-amber-900 mb-4 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            Lotes activos ({lotes.length})
          </h2>
          {lotes.length === 0 ? (
            <p className="text-amber-500 text-sm text-center py-8">
              No hay lotes activos registrados
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {lotes.map(l => {
                const dias = diasParaVencer(l.fecha_vencimiento)
                const urgente = dias <= 1
                return (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border
                      ${urgente
                        ? 'border-red-200 bg-red-50'
                        : dias <= 3
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-amber-100 bg-amber-50'
                      }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-amber-900 truncate">{l.producto_nombre}</p>
                      <p className={`text-xs mt-0.5 ${urgente ? 'text-red-600' : 'text-amber-600'}`}>
                        Vence: {l.fecha_vencimiento} · {l.cantidad_disponible} uds disponibles
                      </p>
                    </div>
                    <button
                      onClick={() => darDeBaja(l.id, l.producto_nombre, l.cantidad_disponible)}
                      title="Dar de baja este lote"
                      className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                                 text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
