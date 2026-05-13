import { ShoppingCart, BookOpen, ChefHat, LogOut, X } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'pos',     label: 'Punto de Venta', icon: ShoppingCart, desc: 'CU-01' },
  { id: 'recetas', label: 'Recetario',       icon: BookOpen,     desc: 'CU-05' },
]

const ROLE_LABEL = {
  admin:    'Administrador',
  cajero:   'Cajero',
  panadero: 'Panadero',
}

function getInitials(nombre) {
  const parts = nombre.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase()
}

export default function Sidebar({ modulo, onModulo, user, onLogout, open, onClose }) {
  return (
    <>
      {/* Backdrop solo en móvil cuando el drawer está abierto */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      <aside
        className={`
          bg-amber-950 flex flex-col select-none flex-shrink-0
          w-64 lg:w-60
          fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          h-screen
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 lg:py-6 border-b border-amber-900/60">
          <div className="w-9 h-9 bg-amber-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
            <ChefHat className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-heading text-white font-bold text-[15px] block leading-snug tracking-tight">
              SIG-BAKERY
            </span>
            <span className="text-amber-400 text-[11px] font-medium">Panadería CEFAS</span>
          </div>
          {/* Cerrar drawer en móvil */}
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="lg:hidden w-8 h-8 rounded-lg text-amber-300 hover:bg-amber-900/60 hover:text-white
                       flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent
                       flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Módulos">
          <p className="text-amber-600/70 text-[10px] font-bold uppercase tracking-widest px-3 mb-3">
            Módulos
          </p>
          {NAV_ITEMS.map(({ id, label, icon: Icon, desc }) => {
            const active = modulo === id
            return (
              <button
                key={id}
                onClick={() => onModulo(id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                            transition-all duration-150 cursor-pointer border-0 group
                            ${active
                              ? 'bg-amber-700 text-white shadow-sm'
                              : 'text-amber-300/80 hover:bg-amber-900/50 hover:text-white'
                            }`}
              >
                <Icon
                  style={{ width: 17, height: 17 }}
                  className={`flex-shrink-0 transition-colors ${
                    active ? 'text-amber-200' : 'text-amber-500 group-hover:text-amber-200'
                  }`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block leading-tight">{label}</span>
                  <span className={`text-[10px] font-medium ${
                    active ? 'text-amber-300' : 'text-amber-600 group-hover:text-amber-400'
                  }`}>
                    {desc}
                  </span>
                </div>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-5 pt-3 border-t border-amber-900/60">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div
              className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center flex-shrink-0"
              aria-hidden
            >
              <span className="text-white text-xs font-bold">
                {user ? getInitials(user.nombre) : '??'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-amber-100 text-sm font-semibold block truncate leading-tight">
                {user?.nombre ?? '—'}
              </span>
              <span className="text-amber-500 text-[11px]">
                {ROLE_LABEL[user?.rol] ?? user?.rol ?? '—'}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-7 h-7 rounded-lg text-amber-500 hover:bg-amber-900/60 hover:text-amber-200
                         flex items-center justify-center transition-all cursor-pointer border-0 flex-shrink-0"
            >
              <LogOut style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
