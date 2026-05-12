import { useEffect, useState } from 'react'
import {
  Search, ShoppingCart, Wheat, Cookie, Cake, Star,
  Minus, Plus, X, CheckCircle, Loader2,
} from 'lucide-react'
import { api } from '../../api'

const CATEGORY_ICON = { 1: Wheat, 2: Cookie, 3: Cake, 4: Star }
const CATEGORY_COLOR = {
  1: 'bg-amber-100  text-amber-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-rose-100   text-rose-700',
  4: 'bg-violet-100 text-violet-700',
}

function ProductIcon({ categoriaId, size = 'md' }) {
  const Icon = CATEGORY_ICON[categoriaId] ?? Wheat
  const color = CATEGORY_COLOR[categoriaId] ?? 'bg-amber-100 text-amber-700'
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'
  const ico = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className={ico} aria-hidden />
    </div>
  )
}

function VentaCompletada({ venta, onNueva }) {
  return (
    <div className="flex items-center justify-center min-h-[72vh]">
      <div className="card p-10 max-w-md w-full text-center shadow-md">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-emerald-800 mb-1">
          Venta completada
        </h2>
        <p className="text-sm text-emerald-600 mb-6">
          {venta.fecha.toLocaleString('es-GT')}
        </p>

        <div className="border-t border-dashed border-amber-200 pt-4 space-y-2 text-left mb-5">
          {venta.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-amber-800">
                {item.nombre}
                <span className="text-amber-400 ml-1">×{item.cantidad}</span>
              </span>
              <span className="font-semibold text-amber-900">
                Q {(item.precio * item.cantidad).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-emerald-200 pt-4 space-y-2">
          <div className="flex justify-between text-lg font-bold text-amber-900">
            <span>Total</span>
            <span>Q {venta.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-amber-500">
            <span>Recibido</span>
            <span>Q {venta.monto.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-emerald-700">
            <span>Cambio</span>
            <span>Q {venta.cambio.toFixed(2)}</span>
          </div>
        </div>

        <button onClick={onNueva} className="btn-primary w-full mt-7 py-3 text-base">
          Nueva venta
        </button>
      </div>
    </div>
  )
}

export default function ModuloPOS({ onToast, user }) {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const [carrito, setCarrito] = useState([])
  const [buscar, setBuscar] = useState('')
  const [catFiltro, setCatFiltro] = useState(0)
  const [montoRecibido, setMontoRecibido] = useState('')
  const [showCobrar, setShowCobrar] = useState(false)
  const [ventaCompletada, setVentaCompletada] = useState(null)

  const cargarProductos = async () => {
    try {
      const [prods, cats] = await Promise.all([
        api.productos({ soloDisponibles: false }),
        api.categorias(),
      ])
      setProductos(prods.map(p => ({ ...p, precio_venta: Number(p.precio_venta) })))
      setCategorias(cats)
    } catch (err) {
      onToast(`Error al cargar productos: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarProductos() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const productosFiltrados = productos.filter(p => {
    if (p.stock_actual <= 0) return false
    if (catFiltro !== 0 && p.categoria_id !== catFiltro) return false
    const q = buscar.toLowerCase()
    return p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(buscar)
  })

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const found = prev.find(i => i.producto_id === producto.id)
      if (found) {
        if (found.cantidad >= producto.stock_actual) {
          onToast(`Stock insuficiente para "${producto.nombre}"`, 'error')
          return prev
        }
        return prev.map(i =>
          i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        cantidad: 1,
        categoria_id: producto.categoria_id,
      }]
    })
  }

  const actualizarCantidad = (productoId, delta) => {
    setCarrito(prev =>
      prev.map(i => {
        if (i.producto_id !== productoId) return i
        const prod = productos.find(p => p.id === productoId)
        const nueva = i.cantidad + delta
        if (nueva <= 0) return null
        if (nueva > prod.stock_actual) {
          onToast(`Stock máximo disponible: ${prod.stock_actual}`, 'warning')
          return i
        }
        return { ...i, cantidad: nueva }
      }).filter(Boolean)
    )
  }

  const eliminarDelCarrito = (productoId) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== productoId))
  }

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const totalArticulos = carrito.reduce((s, i) => s + i.cantidad, 0)

  const confirmarVenta = async () => {
    const monto = parseFloat(montoRecibido)
    if (isNaN(monto) || monto < total) {
      onToast(`Monto insuficiente. Total: Q ${total.toFixed(2)}`, 'error')
      return
    }
    if (!user?.id) {
      onToast('Sesión inválida. Vuelve a iniciar sesión.', 'error')
      return
    }
    setProcesando(true)
    try {
      const resp = await api.registrarVenta({
        usuario_id: user.id,
        items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        monto_recibido: monto,
      })
      setVentaCompletada({
        items: carrito,
        total: Number(resp.total),
        monto,
        cambio: Number(resp.cambio),
        fecha: new Date(),
      })
      setCarrito([])
      setMontoRecibido('')
      setShowCobrar(false)
      onToast('¡Venta registrada exitosamente!', 'success')
      await cargarProductos()
    } catch (err) {
      onToast(`Error al registrar venta: ${err.message}`, 'error')
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-amber-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" aria-hidden />
        Cargando productos…
      </div>
    )
  }

  if (ventaCompletada) {
    return <VentaCompletada venta={ventaCompletada} onNueva={() => setVentaCompletada(null)} />
  }

  const cambioPreview = montoRecibido && parseFloat(montoRecibido) >= total
    ? (parseFloat(montoRecibido) - total).toFixed(2)
    : null

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold text-amber-900">Punto de Venta</h1>
        <p className="text-sm text-amber-500 mt-0.5">Registra ventas y gestiona el ticket</p>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── LEFT: Product browser ── */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-3">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400"
              aria-hidden
            />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder="Buscar producto o código de barras…"
              className="input-field pl-10"
              aria-label="Buscar producto"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filtrar por categoría">
            {[{ id: 0, nombre: 'Todos' }, ...categorias].map(c => (
              <button
                key={c.id}
                onClick={() => setCatFiltro(c.id)}
                aria-pressed={catFiltro === c.id}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                            cursor-pointer border-0 font-sans
                            ${catFiltro === c.id
                              ? 'bg-amber-800 text-white shadow-sm'
                              : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'
                            }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {productosFiltrados.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-amber-200" aria-hidden />
                <p className="text-sm text-amber-400 font-medium">No se encontraron productos</p>
              </div>
            ) : (
              productosFiltrados.map(p => {
                const lowStock = p.stock_actual < 10
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p)}
                    className="card p-4 flex flex-col items-center gap-2.5 cursor-pointer border-0 text-left
                               hover:shadow-md hover:-translate-y-0.5 active:scale-95
                               transition-all duration-150 group"
                    aria-label={`Agregar ${p.nombre} al carrito`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                                    transition-transform duration-150 group-hover:scale-110
                                    ${CATEGORY_COLOR[p.categoria_id] ?? 'bg-amber-100 text-amber-700'}`}>
                      {(() => { const Icon = CATEGORY_ICON[p.categoria_id] ?? Wheat; return <Icon className="w-6 h-6" aria-hidden /> })()}
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold text-amber-900 leading-tight line-clamp-2">
                        {p.nombre}
                      </p>
                      <p className="text-base font-bold text-amber-700 mt-1">
                        Q {p.precio_venta.toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-semibold mt-0.5 block ${
                        lowStock ? 'text-red-500' : 'text-amber-400'
                      }`}>
                        {lowStock ? `¡Solo ${p.stock_actual}!` : `Stock: ${p.stock_actual}`}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="w-[340px] xl:w-[376px] flex-shrink-0">
          <div
            className="card flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 7rem)', position: 'sticky', top: 0 }}
          >
            {/* Cart header */}
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-amber-900">Ticket de venta</h2>
                <p className="text-xs text-amber-400 mt-0.5">
                  {totalArticulos === 0
                    ? 'Sin productos'
                    : `${totalArticulos} artículo${totalArticulos !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-amber-700" aria-hidden />
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-3" aria-label="Productos en el carrito">
              {carrito.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-amber-200" aria-hidden />
                  <p className="text-sm text-amber-300 font-medium">
                    Selecciona productos del catálogo
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {carrito.map(item => (
                    <div
                      key={item.producto_id}
                      className="flex items-center gap-2.5 py-2.5 border-b border-amber-50 last:border-0"
                    >
                      <ProductIcon categoriaId={item.categoria_id} size="sm" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-900 truncate leading-tight">
                          {item.nombre}
                        </p>
                        <p className="text-xs text-amber-400">Q {item.precio.toFixed(2)} c/u</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, -1)}
                          aria-label="Disminuir cantidad"
                          className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700
                                     flex items-center justify-center transition-colors cursor-pointer border-0"
                        >
                          <Minus style={{ width: 12, height: 12 }} />
                        </button>
                        <span className="text-sm font-bold text-amber-900 w-6 text-center tabular-nums">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, 1)}
                          aria-label="Aumentar cantidad"
                          className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700
                                     flex items-center justify-center transition-colors cursor-pointer border-0"
                        >
                          <Plus style={{ width: 12, height: 12 }} />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-amber-800 w-[54px] text-right tabular-nums">
                        Q {(item.precio * item.cantidad).toFixed(2)}
                      </span>

                      <button
                        onClick={() => eliminarDelCarrito(item.producto_id)}
                        aria-label={`Eliminar ${item.nombre}`}
                        className="w-6 h-6 rounded-lg text-amber-300 hover:bg-red-50 hover:text-red-500
                                   flex items-center justify-center transition-all cursor-pointer border-0"
                      >
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            <div className="border-t border-amber-100 bg-amber-50 px-5 py-4">
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-heading font-bold text-amber-900 text-lg">Total</span>
                <span className="font-heading font-bold text-amber-800 text-2xl tabular-nums">
                  Q {total.toFixed(2)}
                </span>
              </div>

              {showCobrar ? (
                <div className="space-y-3">
                  <div>
                    <label className="label" htmlFor="monto-recibido">Efectivo recibido</label>
                    <input
                      id="monto-recibido"
                      type="number"
                      value={montoRecibido}
                      onChange={e => setMontoRecibido(e.target.value)}
                      placeholder="Q 0.00"
                      autoFocus
                      className="input-field text-right text-lg font-bold tabular-nums"
                      min={total}
                      step="0.01"
                    />
                    {cambioPreview && (
                      <p className="text-right text-sm text-emerald-600 font-bold mt-1.5 tabular-nums">
                        Cambio: Q {cambioPreview}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCobrar(false)}
                      className="btn-secondary flex-1"
                      disabled={procesando}
                    >
                      Atrás
                    </button>
                    <button
                      onClick={confirmarVenta}
                      className="btn-success flex-[2] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!cambioPreview || procesando}
                    >
                      {procesando ? 'Procesando…' : 'Confirmar venta'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCarrito([])}
                    disabled={carrito.length === 0}
                    className="btn-danger flex-1 disabled:opacity-40 disabled:cursor-not-allowed py-2.5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setShowCobrar(true)}
                    disabled={carrito.length === 0}
                    className="btn-success flex-[2] py-2.5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Cobrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
