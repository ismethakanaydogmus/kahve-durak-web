import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { Layout } from './components/layout/Layout'
import { NotFoundPage } from './components/layout/NotFoundPage'
import { AccountPage } from './features/account/AccountPage'
import { AdminDashboardPage } from './features/admin/AdminDashboardPage'
import { AdminLayout } from './features/admin/AdminLayout'
import { AdminOrderDetailPage } from './features/admin/AdminOrderDetailPage'
import { AdminOrdersPage } from './features/admin/AdminOrdersPage'
import { AdminMenuPage } from './features/admin/menu/AdminMenuPage'
import { ProductEditorPage } from './features/admin/menu/ProductEditorPage'
import { AdminContentPage } from './features/admin/content/AdminContentPage'
import { AdminSettingsPage } from './features/admin/settings/AdminSettingsPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { RequireAdmin } from './features/auth/RequireAdmin'
import { RequireAuth } from './features/auth/RequireAuth'
import { HomePage } from './features/home/HomePage'
import { MenuPage } from './features/menu/MenuPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { OrderDetailPage } from './features/orders/OrderDetailPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'giris', element: <LoginPage /> },
      { path: 'kayit', element: <RegisterPage /> },
      { path: 'hesap', element: <RequireAuth><AccountPage /></RequireAuth> },
      { path: 'odeme', element: <RequireAuth><CheckoutPage /></RequireAuth> },
      { path: 'siparis/:id', element: <RequireAuth><OrderDetailPage /></RequireAuth> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'admin',
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true, element: <Navigate to="siparisler" replace /> },
      { path: 'siparisler', element: <AdminOrdersPage /> },
      { path: 'siparisler/:id', element: <AdminOrderDetailPage /> },
      { path: 'menu', element: <AdminMenuPage /> },
      { path: 'menu/urun/yeni', element: <ProductEditorPage /> },
      { path: 'menu/urun/:id', element: <ProductEditorPage /> },
      { path: 'icerik', element: <AdminContentPage /> },
      { path: 'ayarlar', element: <AdminSettingsPage /> },
      { path: 'ozet', element: <AdminDashboardPage /> },
    ],
  },
]
