import { useState } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { CartDrawer } from '../../features/cart/CartDrawer'
import { DemoBanner } from './DemoBanner'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const [cartOpen, setCartOpen] = useState(false)
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ScrollRestoration />
    </div>
  )
}
