import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { YoutubeIcon } from '../ui/YoutubeIcon'
import { useData } from '../../context/DataContext'
import { trackContactClick } from '../../utils/analytics'
import { safeExternalUrl, safeWhatsAppUrl } from '../../utils/safeUrl'
import { ButtonLink } from '../ui/Button'
import { InstagramIcon } from '../ui/InstagramIcon'
import { Logo } from '../ui/Logo'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

const navLinks = [
  { to: '/', label: 'Главная' },
  { to: '/catalog', label: 'Каталог' },
  { to: '/about', label: 'О нас' },
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/gallery', label: 'Фотогалерея' },
  { to: '/contacts', label: 'Контакты' },
]

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { siteSettings } = useData()
  const { contacts } = siteSettings
  const whatsappUrl = safeWhatsAppUrl(contacts.whatsapp, contacts.whatsapp)
  const instagramUrl = safeExternalUrl(contacts.instagram, contacts.instagram)
  const youtubeUrl = safeExternalUrl(contacts.youtube, contacts.youtube)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div
        className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col bg-surface p-5 shadow-2xl animate-slide-up supports-[padding:max(0px)]:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="mb-6 flex min-w-0 items-center justify-between gap-3 sm:mb-8">
          <Logo size="nav" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-border"
            aria-label="Закрыть меню"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Мобильная навигация">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3.5 text-base font-bold uppercase tracking-wide transition-colors sm:py-4 sm:text-lg ${
                  isActive
                    ? 'bg-primary text-dark'
                    : 'text-dark hover:bg-background'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 pt-6 sm:pt-8">
          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('whatsapp')}
              className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-border text-[10px] font-semibold sm:text-xs"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
              <span className="truncate">WhatsApp</span>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('instagram')}
              className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-border text-[10px] font-semibold sm:text-xs"
              aria-label="Instagram"
            >
              <InstagramIcon size={18} />
              <span className="truncate">Instagram</span>
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('youtube')}
              className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-border text-[10px] font-semibold sm:text-xs"
              aria-label="YouTube"
            >
              <YoutubeIcon size={18} />
              <span className="truncate">YouTube</span>
            </a>
          </div>
          <ButtonLink
            to="/contacts"
            variant="secondary"
            onClick={() => {
              trackContactClick('contacts_cta')
              onClose()
            }}
          >
            Связаться с нами
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
