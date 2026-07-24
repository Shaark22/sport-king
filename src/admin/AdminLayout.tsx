import { useLocation, Navigate, Outlet, NavLink, Link } from 'react-router-dom'
import { LayoutGrid, Package, Tags, LogOut, ExternalLink, BarChart3, MessageSquare, ClipboardList, Settings, AlertTriangle, Images } from 'lucide-react'
import { useData } from '../context/DataContext'
import { Logo } from '../components/ui/Logo'
import { publicSiteUrl } from './publicSiteUrl'

const links = [
  { to: '/', label: 'Обзор', icon: LayoutGrid, end: true },
  { to: '/statistics', label: 'Статистика', icon: BarChart3 },
  { to: '/products', label: 'Товары', icon: Package },
  { to: '/orders', label: 'Заявки', icon: ClipboardList },
  { to: '/reviews', label: 'Отзывы', icon: MessageSquare },
  { to: '/gallery', label: 'Фотогалерея', icon: Images },
  { to: '/categories', label: 'Категории', icon: Tags },
  { to: '/settings', label: 'Настройки', icon: Settings },
  { to: '/errors', label: 'Ошибки', icon: AlertTriangle },
]

export function AdminLayout() {
  const { isAdmin, logout } = useData()
  const location = useLocation()

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="nav" />
            <span className="hidden text-xs font-bold uppercase tracking-widest text-text-secondary sm:inline">
              Админ
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={publicSiteUrl('/')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold uppercase tracking-wide text-dark sm:px-4 sm:text-sm"
            >
              <ExternalLink size={16} />
              <span className="hidden sm:inline">На сайт</span>
            </a>
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-dark px-3 text-xs font-bold uppercase tracking-wide text-white sm:px-4 sm:text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <nav className="mb-8 flex gap-2 overflow-x-auto pb-1">
          {links.map(({ to, label, icon: Icon, end }) => {
            const active = end
              ? location.pathname === to
              : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                  active
                    ? 'bg-primary text-dark'
                    : 'bg-surface text-text-secondary hover:text-dark'
                }`}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
