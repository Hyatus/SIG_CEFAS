import { useState } from 'react'
import { Plus, ChevronDown, Pencil, Trash2, BookOpen } from 'lucide-react'
import { RECETAS_INIT, CATEGORIAS, INSUMOS } from '../../data/mockData'
import RecetaForm from './RecetaForm'

const CATEGORY_COLOR = {
  1: 'bg-amber-100  text-amber-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-rose-100   text-rose-700',
  4: 'bg-violet-100 text-violet-700',
}

function calcCosto(ingredientes) {
  return ingredientes.reduce((s, i) => {
    const ins = INSUMOS.find(x => x.id === i.insumo_id)
    return s + (ins ? ins.costo_unitario * i.cantidad : 0)
  }, 0)
}

export default function ModuloRecetas({ onToast }) {
  const [recetas, setRecetas] = useState(RECETAS_INIT)
  const [showForm, setShowForm] = useState(false)
  const [editReceta, setEditReceta] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filtro, setFiltro] = useState(0)

  const recetasFiltradas = filtro === 0
    ? recetas
    : recetas.filter(r => r.categoria_id === filtro)

  const openNew = () => { setEditReceta(null); setShowForm(true); setExpandedId(null) }
  const openEdit = (r) => { setEditReceta(r); setShowForm(true); setExpandedId(null) }
  const closeForm = () => { setShowForm(false); setEditReceta(null) }

  const handleSave = (data) => {
    if (data.id) {
      setRecetas(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r))
      onToast('Receta actualizada correctamente', 'success')
    } else {
      const newId = Math.max(0, ...recetas.map(r => r.id)) + 1
      setRecetas(prev => [...prev, { ...data, id: newId, activa: true }])
      onToast('¡Receta creada exitosamente!', 'success')
    }
    closeForm()
  }

  const handleDelete = (id) => {
    setRecetas(prev => prev.filter(r => r.id !== id))
    onToast('Receta eliminada', 'warning')
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-amber-900">Recetario digital</h1>
          <p className="text-sm text-amber-500 mt-0.5">
            {recetas.length} receta{recetas.length !== 1 ? 's' : ''} registrada{recetas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" aria-hidden />
          Nueva receta
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5 flex-wrap" role="group" aria-label="Filtrar por categoría">
        {[{ id: 0, nombre: 'Todas' }, ...CATEGORIAS].map(c => (
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
        <RecetaForm receta={editReceta} onSave={handleSave} onCancel={closeForm} />
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
            const cat = CATEGORIAS.find(c => c.id === r.categoria_id)
            const costo = calcCosto(r.ingredientes)
            const expanded = expandedId === r.id
            const colorClass = CATEGORY_COLOR[r.categoria_id] ?? 'bg-amber-100 text-amber-700'

            return (
              <div key={r.id} className="card overflow-hidden hover:shadow-md transition-shadow duration-200">
                {/* Recipe row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer
                             hover:bg-amber-50/70 transition-colors duration-150 border-0 bg-transparent text-left"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <BookOpen style={{ width: 19, height: 19 }} aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 text-[15px] leading-snug">
                        {r.nombre}
                      </h3>
                      <p className="text-xs text-amber-500 mt-0.5">
                        {cat?.nombre} · {r.rendimiento_unidades} unidades · {r.ingredientes.length} ingredientes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <p className="font-bold text-amber-800 tabular-nums">Q {costo.toFixed(2)}</p>
                      <p className="text-[11px] text-amber-400 tabular-nums">
                        Q {(costo / r.rendimiento_unidades).toFixed(2)} /ud.
                      </p>
                    </div>
                    <ChevronDown
                      style={{ width: 17, height: 17 }}
                      className={`text-amber-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </div>
                </button>

                {/* Expanded: ingredient table + actions */}
                {expanded && (
                  <div className="border-t border-amber-100 px-5 pb-5 pt-4">
                    {r.descripcion && (
                      <p className="text-sm text-amber-500 italic mb-4">{r.descripcion}</p>
                    )}

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
                          {r.ingredientes.map((ing, i) => {
                            const ins = INSUMOS.find(x => x.id === ing.insumo_id)
                            const subtotal = ins ? ins.costo_unitario * ing.cantidad : 0
                            return (
                              <tr key={i} className="border-b border-amber-50 last:border-0">
                                <td className="py-2.5 text-amber-900 font-medium">{ins?.nombre ?? '?'}</td>
                                <td className="py-2.5 text-right text-amber-700 tabular-nums">
                                  {ing.cantidad} {ins?.unidad}
                                </td>
                                <td className="py-2.5 text-right text-amber-500 tabular-nums">
                                  Q {ins?.costo_unitario.toFixed(2)}
                                </td>
                                <td className="py-2.5 text-right font-semibold text-amber-800 tabular-nums">
                                  Q {subtotal.toFixed(2)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

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
