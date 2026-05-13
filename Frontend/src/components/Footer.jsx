import { Github } from 'lucide-react'

const REPO_URL = 'https://github.com/Hyatus/SIG_CEFAS'

export default function Footer({ variant = 'app' }) {
  const isLogin = variant === 'login'
  return (
    <footer
      className={`flex items-center justify-center pt-6 pb-4 ${isLogin ? 'mt-4' : 'mt-8'}`}
    >
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Ver código fuente en GitHub"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                   text-amber-700 hover:text-amber-900 hover:bg-amber-100
                   transition-colors duration-150 text-xs font-semibold"
      >
        <Github className="w-4 h-4" aria-hidden />
        <span>Ver en GitHub</span>
      </a>
    </footer>
  )
}
