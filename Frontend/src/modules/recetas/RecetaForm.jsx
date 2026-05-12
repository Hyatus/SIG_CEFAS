import { useState } from 'react'
import { Plus, X, ChefHat } from 'lucide-react'

export default function RecetaForm({ receta, categorias, insumos, onSave, onCancel, saving }) {
  const firstInsumoId = insumos[0]?.id ?? 1
  const firstCategoriaId = categorias[0]?.id ?? 1

  const [form, setForm] = useState({
    nombre: receta?.nombre ?? '',
    categoria_id: receta?.categoria_id ?? firstCategoriaId,
    descripcion: receta?.descripcion ?? '',
    rendimiento_unidades: receta?.rendimiento_unidades ?? 1,
    ingredientes: receta?.ingredientes?.length
      ? receta.ingredientes.map(i => ({ insumo_id: i.insumo_id, cantidad: Number(i.cantidad) }))
      : [{ insumo_id: firstInsumoId, cantidad: 0 }],
  })

  const set = (patch) => setForm(f => ({ ...f, ...patch }))

  const addIngrediente = () =>
    set({ ingredientes: [...form.ingredientes, { insumo_id: firstInsumoId, cantidad: 0 }] })

  const removeIngrediente = (idx) =>
    set({ ingredientes: form.ingredientes.filter((_, i) => i !== idx) })

  const updateIngrediente = (idx, field, value) =>
    set({
      ingredientes: form.ingredientes.map((ing, i) =>
        i === idx
          ? { ...ing, [field]: field === 'cantidad' ? parseFloat(value) || 0 : parseInt(value) }
          : ing
      ),
    })

  const costoTotal = form.ingredientes.reduce((sum, ing) => {
    const ins = insumos.find(i => i.id === ing.insumo_id)
    return sum + (ins ? Number(ins.costo_unitario) * ing.cantidad : 0)
  }, 0)

  const costoPorUnidad = form.rendimiento_unidades > 1
    ? (costoTotal / form.rendimiento_unidades).toFixed(2)
    : null

  const isValid =
    form.nombre.trim() !== '' &&
    form.ingredientes.length > 0 &&
    form.ingredientes.every(i => i.cantidad > 0)

  const handleSubmit = () => {
    if (!isValid || saving) return
    onSave({ ...form, id: receta?.id })
  }

  return (
    <div className="card p-6 mb-5 shadow-md border-amber-200">
      {/* Form header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-amber-700" aria-hidden />
        </div>
        <h3 className="font-heading text-lg font-bold text-amber-900">
          {receta ? 'Editar receta' : 'Nueva receta'}
        </h3>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label" htmlFor="rf-nombre">Nombre de la receta</label>
          <input
            id="rf-nombre"
            className="input-field"
            value={form.nombre}
            onChange={e => set({ nombre: e.target.value })}
            placeholder="Ej: Pan francés"
          />
        </div>
        <div>
          <label className="label" htmlFor="rf-categoria">Categoría</label>
          <select
            id="rf-categoria"
            className="input-field"
            value={form.categoria_id}
            onChange={e => set({ categoria_id: parseInt(e.target.value) })}
          >
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="label" htmlFor="rf-desc">Descripción</label>
          <input
            id="rf-desc"
            className="input-field"
            value={form.descripcion}
            onChange={e => set({ descripcion: e.target.value })}
            placeholder="Descripción breve…"
          />
        </div>
        <div>
          <label className="label" htmlFor="rf-rend">Rendimiento (unidades)</label>
          <input
            id="rf-rend"
            className="input-field"
            type="number"
            min="1"
            value={form.rendimiento_unidades}
            onChange={e => set({ rendimiento_unidades: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <label className="label mb-0">Ingredientes</label>
          <button
            onClick={addIngrediente}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden /> Agregar
          </button>
        </div>

        <div className="space-y-2">
          {form.ingredientes.map((ing, idx) => {
            const ins = insumos.find(i => i.id === ing.insumo_id)
            const costoLinea = ins ? (Number(ins.costo_unitario) * ing.cantidad).toFixed(2) : '0.00'
            return (
              <div
                key={idx}
                className="grid items-center gap-2"
                style={{ gridTemplateColumns: '1fr 130px 70px 36px' }}
              >
                <select
                  className="input-field py-2 text-sm"
                  value={ing.insumo_id}
                  onChange={e => updateIngrediente(idx, 'insumo_id', e.target.value)}
                  aria-label="Seleccionar insumo"
                >
                  {insumos.map(i => (
                    <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
                  ))}
                </select>

                <input
                  className="input-field py-2 text-sm text-right tabular-nums"
                  type="number"
                  step="0.01"
                  min="0"
                  value={ing.cantidad || ''}
                  onChange={e => updateIngrediente(idx, 'cantidad', e.target.value)}
                  placeholder="Cant."
                  aria-label="Cantidad"
                />

                <span className="text-xs text-amber-600 text-right font-semibold tabular-nums pr-1">
                  Q {costoLinea}
                </span>

                <button
                  onClick={() => removeIngrediente(idx)}
                  disabled={form.ingredientes.length === 1}
                  aria-label="Eliminar ingrediente"
                  className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-500
                             flex items-center justify-center transition-colors cursor-pointer border-0
                             disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cost summary */}
      <div className="bg-amber-50 rounded-2xl px-5 py-4 flex justify-between items-center mb-5 border border-amber-100">
        <div>
          <p className="text-[11px] text-amber-600 font-bold uppercase tracking-widest">
            Costo total de la receta
          </p>
          {costoPorUnidad && (
            <p className="text-xs text-amber-500 mt-1 tabular-nums">
              Q {costoPorUnidad} por unidad producida
            </p>
          )}
        </div>
        <span className="font-heading text-2xl font-bold text-amber-800 tabular-nums">
          Q {costoTotal.toFixed(2)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando…' : (receta ? 'Guardar cambios' : 'Crear receta')}
        </button>
      </div>
    </div>
  )
}
