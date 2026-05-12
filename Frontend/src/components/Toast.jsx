import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, cls: 'bg-emerald-600 text-white' },
  error:   { icon: XCircle,     cls: 'bg-red-600 text-white'     },
  warning: { icon: AlertTriangle, cls: 'bg-amber-500 text-white' },
}

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const { icon: Icon, cls } = CONFIG[type] ?? CONFIG.success

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl
                  shadow-2xl max-w-sm animate-slide-in ${cls}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
      <span className="text-sm font-semibold flex-1 leading-tight">{message}</span>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="opacity-70 hover:opacity-100 transition-opacity ml-1 cursor-pointer border-0 bg-transparent p-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
