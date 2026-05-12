import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import ModuloPOS from './modules/pos/ModuloPOS'
import ModuloRecetas from './modules/recetas/ModuloRecetas'
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
  const [user, setUser]     = useState(readStoredUser)
  const [modulo, setModulo] = useState('pos')
  const [toast, setToast]   = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('sig_user')
    setUser(null)
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-amber-50">
      <Sidebar modulo={modulo} onModulo={setModulo} user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1200px]">
          {modulo === 'pos'
            ? <ModuloPOS onToast={showToast} />
            : <ModuloRecetas onToast={showToast} />
          }
        </div>
      </main>

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
