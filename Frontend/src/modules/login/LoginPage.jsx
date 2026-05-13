import { useState } from 'react'
import { ChefHat, LogIn, Eye, EyeOff } from 'lucide-react'
import Footer from '../../components/Footer'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const ROLE_HINT = {
  admin:     { email: 'admin@cefas.gt',     pwd: 'admin123' },
  cajero:    { email: 'cajero1@cefas.gt',   pwd: 'cajero123' },
  panadero:  { email: 'panadero1@cefas.gt', pwd: 'panadero123' },
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Credenciales incorrectas')
      } else {
        localStorage.setItem('sig_user', JSON.stringify(data))
        onLogin(data)
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que la API esté en línea.')
    } finally {
      setLoading(false)
    }
  }

  const fillHint = (role) => {
    setEmail(ROLE_HINT[role].email)
    setPassword(ROLE_HINT[role].pwd)
    setError('')
  }

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="card shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-amber-950 px-8 py-8 text-center">
            <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ChefHat className="w-7 h-7 text-white" aria-hidden />
            </div>
            <h1 className="font-heading text-white text-2xl font-bold tracking-tight">SIG-BAKERY</h1>
            <p className="text-amber-400 text-sm mt-1">Panadería CEFAS</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <h2 className="font-heading text-amber-900 text-xl font-bold">Iniciar sesión</h2>
              <p className="text-amber-500 text-sm mt-0.5">Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-medium"
              >
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="usuario@cefas.gt"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="login-password">Contraseña</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400
                             hover:text-amber-600 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  {showPwd
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye    style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" aria-hidden />
              }
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Dev hints */}
        <div className="mt-4 bg-amber-100/80 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-amber-700 text-xs font-semibold mb-2 uppercase tracking-wide">
            Usuarios de prueba
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ROLE_HINT).map(([role]) => (
              <button
                key={role}
                type="button"
                onClick={() => fillHint(role)}
                className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800
                           text-xs font-semibold transition-colors cursor-pointer border-0 capitalize"
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <Footer variant="login" />

      </div>
    </div>
  )
}
