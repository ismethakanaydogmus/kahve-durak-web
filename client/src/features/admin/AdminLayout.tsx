import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { DemoBanner } from '../../components/layout/DemoBanner'
import { Wordmark } from '../../components/layout/Wordmark'
import { enableSound, readSoundPref, writeSoundPref } from './orderAlert'
import { OrderToasts } from './Toast'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-bean text-foam' : 'text-bean hover:bg-crema/60'}`

// Admin UI is Turkish-only by design (spec §6).
export function AdminLayout() {
  const [soundOn, setSoundOn] = useState(readSoundPref)

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    writeSoundPref(next)
    // This click is the user gesture browsers require before audio may play.
    if (next) void enableSound()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-glow">
      <DemoBanner />
      <header className="border-b border-crema bg-foam">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-2 text-base" aria-label="Siteye dön">
            <Wordmark />
          </Link>
          <span className="text-sm font-semibold text-muted">Yönetim</span>
          <nav aria-label="Yönetim" className="flex flex-wrap gap-1">
            <NavLink to="/admin/siparisler" className={tab}>Siparişler</NavLink>
            <NavLink to="/admin/menu" className={tab}>Menü</NavLink>
            <NavLink to="/admin/icerik" className={tab}>İçerik</NavLink>
            <NavLink to="/admin/ayarlar" className={tab}>Ayarlar</NavLink>
            <NavLink to="/admin/ozet" className={tab}>Özet</NavLink>
          </nav>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            className="ml-auto rounded-full border border-crema-deep px-3 py-1.5 text-sm font-medium text-bean hover:bg-crema/50"
          >
            Sesli bildirim: {soundOn ? 'Açık' : 'Kapalı'}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <OrderToasts soundOn={soundOn} />
    </div>
  )
}
