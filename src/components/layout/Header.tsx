import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { MessageCircle, Menu } from 'lucide-react'
import { YoutubeIcon } from '../ui/YoutubeIcon'
import { useData } from '../../context/DataContext'
import { trackContactClick } from '../../utils/analytics'
import { safeExternalUrl, safeWhatsAppUrl } from '../../utils/safeUrl'
import { ButtonLink } from '../ui/Button'
import { InstagramIcon } from '../ui/InstagramIcon'
import { Logo } from '../ui/Logo'
import { MobileMenu } from './MobileMenu'

const navLinks = [
  { to: '/', label: 'Главная' },
  { to: '/catalog', label: 'Каталог' },
  { to: '/about', label: 'О нас' },
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/gallery', label: 'Фотогалерея' },
  { to: '/contacts', label: 'Контакты' },
]

export function Header() {
  const { siteSettings } = useData()
  const { contacts } = siteSettings
  const whatsappUrl = safeWhatsAppUrl(contacts.whatsapp, contacts.whatsapp)
  const instagramUrl = safeExternalUrl(contacts.instagram, contacts.instagram)
  const youtubeUrl = safeExternalUrl(contacts.youtube, contacts.youtube)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] ${
          scrolled
            ? 'border-b border-border bg-surface/95 shadow-sm backdrop-blur-md'
            : 'bg-background'
        }`}
      >
        <div className="site-container flex min-w-0 items-center gap-2 py-3 sm:gap-3 sm:py-4 lg:grid lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] lg:items-center lg:gap-4 xl:gap-6">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center lg:max-w-none"
            aria-label="SPORT KING — на главную"
          >
            <Logo size="nav" />
          </Link>

          <nav
            className="hidden min-w-0 items-center justify-center gap-3 xl:gap-5 lg:flex"
            aria-label="Основная навигация"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-wide transition-colors xl:text-sm ${
                    isActive
                      ? 'text-dark underline decoration-primary decoration-2 underline-offset-4'
                      : 'text-text-secondary hover:text-dark'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center gap-2 xl:gap-3 lg:flex">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('whatsapp')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-dark transition-colors hover:border-dark hover:bg-dark hover:text-white"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('instagram')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-dark transition-colors hover:border-dark hover:bg-dark hover:text-white"
              aria-label="Instagram"
            >
              <InstagramIcon size={18} />
            </a>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick('youtube')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-dark transition-colors hover:border-dark hover:bg-dark hover:text-white"
              aria-label="YouTube"
            >
              <YoutubeIcon size={18} />
            </a>
            <ButtonLink
              to="/contacts"
              variant="secondary"
              className="!px-5 !text-xs"
              onClick={() => trackContactClick('contacts_cta')}
            >
              Связаться с нами
            </ButtonLink>
          </div>

          <button
            type="button"
            className="ml-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
