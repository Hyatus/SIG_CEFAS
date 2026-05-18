import { useState, useCallback, useEffect } from 'react'
import { Menu, ChefHat } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Footer from './components/Footer'
import ModuloPOS from './modules/pos/ModuloPOS'
import ModuloRecetas from './modules/recetas/ModuloRecetas'
import ModuloProduccion from './modules/produccion/ModuloProduccion'
import LoginPage from './modules/login/LoginPage'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('sig_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser]               = useState(readStoredUser)
  const [modulo, setModulo]           = useState('pos')
  const [toast, setToast]             = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const handleLogin = (userData) => setUser(userData)

  const handleLogout = () => {
    localStorage.removeItem('sig_user')
    setUser(null)
  }

  const handleModulo = (id) => {
    setModulo(id)
    setSidebarOpen(false)
  }

  // Bloquear scroll del body cuando el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-amber-50">
      <Sidebar
        modulo={modulo}
        onModulo={handleModulo}
        user={user}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar móvil (solo <lg) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-amber-950 text-white flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="w-9 h-9 rounded-lg hover:bg-amber-900/60 flex items-center justify-center
                       transition-colors cursor-pointer border-0 bg-transparent text-amber-100"
          >
            <Menu className="w-5 h-5" aria-hidden />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-amber-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-4 h-4 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="font-heading font-bold text-sm block leading-tight truncate">
                SIG-BAKERY
              </span>
              <span className="text-amber-400 text-[10px] block leading-tight truncate">
                {{ pos: 'Punto de Venta', recetas: 'Recetario', produccion: 'Producción' }[modulo] ?? modulo}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6 w-full max-w-[1200px] mx-auto lg:mx-0">
            {modulo === 'pos'        && <ModuloPOS onToast={showToast} user={user} />}
            {modulo === 'recetas'    && <ModuloRecetas onToast={showToast} />}
            {modulo === 'produccion' && <ModuloProduccion onToast={showToast} />}
            <Footer />
          </div>
        </main>
      </div>

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
