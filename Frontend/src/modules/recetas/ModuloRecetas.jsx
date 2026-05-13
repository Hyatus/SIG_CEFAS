import { useEffect, useState } from 'react'
import { Plus, ChevronDown, Pencil, Trash2, BookOpen, Loader2 } from 'lucide-react'
import { api } from '../../api'
import RecetaForm from './RecetaForm'

const CATEGORY_COLOR = {
  1: 'bg-amber-100  text-amber-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-rose-100   text-rose-700',
  4: 'bg-violet-100 text-violet-700',
}

export default function ModuloRecetas({ onToast }) {
  const [recetas, setRecetas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editReceta, setEditReceta] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [detalleCache, setDetalleCache] = useState({})  // { [recetaId]: ingredientes }
  const [filtro, setFiltro] = useState(0)

  const cargar = async () => {
    setLoading(true)
    try {
      const [recs, cats, ins] = await Promise.all([
        api.recetas(),
        api.categorias(),
        api.insumos(),
      ])
      setRecetas(recs)
      setCategorias(cats)
      setInsumos(ins)
    } catch (err) {
      onToast(`No se pudieron cargar las recetas: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const recetasFiltradas = filtro === 0
    ? recetas
    : recetas.filter(r => r.categoria_id === filtro)

  const toggleExpanded = async (r) => {
    if (expandedId === r.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(r.id)
    if (!detalleCache[r.id]) {
      try {
        const det = await api.recetaDetalle(r.id)
        setDetalleCache(c => ({ ...c, [r.id]: det.ingredientes ?? [] }))
      } catch (err) {
        onToast(`Error al cargar el detalle: ${err.message}`, 'error')
      }
    }
  }

  const openNew = () => { setEditReceta(null); setShowForm(true); setExpandedId(null) }

  const openEdit = async (r) => {
    try {
      const det = await api.recetaDetalle(r.id)
      setEditReceta({
        ...r,
        ingredientes: (det.ingredientes ?? []).map(i => ({
          insumo_id: i.insumo_id,
          cantidad: Number(i.cantidad),
        })),
      })
      setShowForm(true)
      setExpandedId(null)
    } catch (err) {
      onToast(`No se pudo abrir la receta: ${err.message}`, 'error')
    }
  }

  const closeForm = () => { setShowForm(false); setEditReceta(null) }

  const handleSave = async (data) => {
    setSaving(true)
    try {
      const payload = {
        nombre: data.nombre,
        categoria_id: data.categoria_id,
        descripcion: data.descripcion || null,
        rendimiento_unidades: data.rendimiento_unidades,
        ingredientes: data.ingredientes.map(i => ({
          insumo_id: i.insumo_id,
          cantidad: i.cantidad,
        })),
      }
      if (data.id) {
        await api.editarReceta(data.id, payload)
        onToast('Receta actualizada correctamente', 'success')
        setDetalleCache(c => { const n = { ...c }; delete n[data.id]; return n })
      } else {
        await api.crearReceta(payload)
        onToast('¡Receta creada exitosamente!', 'success')
      }
      closeForm()
      await cargar()
    } catch (err) {
      onToast(`Error al guardar: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta receta? Se desactivará del catálogo.')) return
    try {
      await api.borrarReceta(id)
      onToast('Receta eliminada', 'warning')
      setRecetas(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      onToast(`Error al eliminar: ${err.message}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-amber-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" aria-hidden />
        Cargando recetas…
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-amber-900">Recetario digital</h1>
          <p className="text-xs sm:text-sm text-amber-500 mt-0.5">
            {recetas.length} receta{recetas.length !== 1 ? 's' : ''} registrada{recetas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center justify-center gap-2 self-stretch sm:self-auto">
          <Plus className="w-4 h-4" aria-hidden />
          Nueva receta
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap" role="group" aria-label="Filtrar por categoría">
        {[{ id: 0, nombre: 'Todas' }, ...categorias].map(c => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            aria-pressed={filtro === c.id}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                        cursor-pointer border-0 font-sans
                        ${filtro === c.id
                          ? 'bg-amber-800 text-white shadow-sm'
                          : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Inline form */}
      {showForm && (
        <RecetaForm
          receta={editReceta}
          categorias={categorias}
          insumos={insumos}
          saving={saving}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {/* Recipe list */}
      {recetasFiltradas.length === 0 ? (
        <div className="card py-20 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-amber-200" aria-hidden />
          <p className="text-sm text-amber-400 font-medium">
            No hay recetas en esta categoría
          </p>
          <button onClick={openNew} className="btn-secondary mt-4 text-xs">
            Crear la primera receta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recetasFiltradas.map(r => {
            const costo = Number(r.costo_total ?? 0)
            const expanded = expandedId === r.id
            const colorClass = CATEGORY_COLOR[r.categoria_id] ?? 'bg-amber-100 text-amber-700'
            const ingredientes = detalleCache[r.id] ?? []

            return (
              <div key={r.id} className="card overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Recipe row */}
                <button
                  className="w-full flex items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 cursor-pointer
                             hover:bg-amber-50/70 transition-colors duration-150 border-0 bg-transparent text-left"
                  onClick={() => toggleExpanded(r)}
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <BookOpen style={{ width: 19, height: 19 }} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-amber-900 text-sm sm:text-[15px] leading-snug truncate">
                        {r.nombre}
                      </h3>
                      <p className="text-xs text-amber-500 mt-0.5 truncate">
                        {r.categoria_nombre} · {r.rendimiento_unidades} unidades
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-amber-800 tabular-nums text-sm sm:text-base">Q {costo.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-[11px] text-amber-400 tabular-nums">
                        Q {(costo / Math.max(r.rendimiento_unidades, 1)).toFixed(2)} /ud.
                      </p>
                    </div>
                    <ChevronDown
                      style={{ width: 17, height: 17 }}
                      className={`text-amber-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </div>
                </button>

                {/* Expanded: ingredient table + actions */}
                {expanded && (
                  <div className="border-t border-amber-100 px-3 sm:px-5 pb-4 sm:pb-5 pt-4">
                    {r.descripcion && (
                      <p className="text-sm text-amber-500 italic mb-4">{r.descripcion}</p>
                    )}

                    {ingredientes.length === 0 ? (
                      <p className="text-sm text-amber-400 py-4 text-center">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-1" aria-hidden />
                        Cargando ingredientes…
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" role="table">
                          <thead>
                            <tr className="border-b-2 border-amber-100">
                              {['Insumo', 'Cantidad', 'Costo unit.', 'Subtotal'].map((h, i) => (
                                <th
                                  key={h}
                                  scope="col"
                                  className={`py-2 text-[11px] font-bold text-amber-500 uppercase tracking-widest
                                              ${i === 0 ? 'text-left' : 'text-right'}`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ingredientes.map((ing, i) => (
                              <tr key={i} className="border-b border-amber-50 last:border-0">
                                <td className="py-2.5 text-amber-900 font-medium">{ing.insumo_nombre}</td>
                                <td className="py-2.5 text-right text-amber-700 tabular-nums">
                                  {Number(ing.cantidad)} {ing.unidad}
                                </td>
                                <td className="py-2.5 text-right text-amber-500 tabular-nums">
                                  Q {Number(ing.costo_unitario).toFixed(2)}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-amber-800 tabular-nums">
                                  Q {Number(ing.costo_ingrediente).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Row actions */}
                    <div className="flex gap-2 mt-4 justify-end">
                      <button
                        onClick={() => openEdit(r)}
                        className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="btn-danger flex items-center gap-1.5 py-2 px-4 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
