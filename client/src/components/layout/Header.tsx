import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { selectIsAdmin, useAuthStore } from '../../stores/authStore'
import { CloseIcon, MenuIcon, UserIcon } from '../ui/icons'
import { CartButton } from '../../features/cart/CartButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Wordmark } from './Wordmark'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-1.5 font-medium transition-colors ${isActive ? 'bg-crema text-bean' : 'text-ink hover:bg-crema/60'}`

export function Header({ onCartClick = () => {} }: { onCartClick?: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore(selectIsAdmin)
  const logout = useAuthStore((s) => s.logout)
  const close = () => setOpen(false)

  const links = (
    <>
      <NavLink to="/menu" className={navClass} onClick={close}>{t('nav.menu')}</NavLink>
      <Link to="/#iletisim" className={navClass({ isActive: false })} onClick={close}>{t('nav.contact')}</Link>
      {isAdmin && <NavLink to="/admin" className={navClass} onClick={close}>{t('nav.admin')}</NavLink>}
    </>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-crema bg-glow/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" aria-label="Kahve Durak" onClick={close} className="mr-auto text-lg">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{links}</nav>

        <div className="hidden sm:block"><LanguageSwitcher /></div>

        {user ? (
          <div className="hidden items-center gap-2 md:flex">
            <NavLink to="/hesap" className={navClass}>{t('auth.hello', { name: user.firstName })}</NavLink>
            <button type="button" onClick={logout} className="text-sm text-muted underline-offset-4 hover:underline">
              {t('nav.logout')}
            </button>
          </div>
        ) : (
          <NavLink to="/giris" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-bean hover:bg-crema/60 md:flex">
            <UserIcon width={18} height={18} />
            {t('nav.login')}
          </NavLink>
        )}

        <CartButton onClick={onCartClick} />

        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-bean hover:bg-crema/60 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="flex flex-col gap-1 border-t border-crema px-4 py-3 md:hidden">
          {links}
          {user ? (
            <>
              <NavLink to="/hesap" className={navClass} onClick={close}>{t('nav.account')}</NavLink>
              <button type="button" onClick={() => { logout(); close() }} className="rounded-full px-3 py-1.5 text-left font-medium text-muted">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <NavLink to="/giris" className={navClass} onClick={close}>{t('nav.login')}</NavLink>
          )}
          <div className="pt-2 sm:hidden"><LanguageSwitcher /></div>
        </nav>
      )}
    </header>
  )
}
