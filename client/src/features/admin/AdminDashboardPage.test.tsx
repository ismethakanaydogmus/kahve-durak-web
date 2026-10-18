import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import type { DashboardDto } from '../../lib/types'
import { AdminDashboardPage } from './AdminDashboardPage'

const serve = (d: DashboardDto) => server.use(http.get(api('/api/admin/dashboard'), () => HttpResponse.json(d)))

describe('AdminDashboardPage', () => {
  it('shows today and the best sellers', async () => {
    serve({
      todayRevenue: 350, todayOrders: 2, averageBasket: 175,
      topProducts: [{ nameTr: 'Latte', quantity: 3, revenue: 540 }, { nameTr: 'Su', quantity: 3, revenue: 120 }],
    })
    renderWithProviders(<AdminDashboardPage />)

    expect((await screen.findByText('Bugünkü ciro')).parentElement).toHaveTextContent('₺350,00')
    expect(screen.getByText('Bugünkü sipariş').parentElement).toHaveTextContent('2')
    expect(screen.getByText('Ortalama sepet').parentElement).toHaveTextContent('₺175,00')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.textContent)).toEqual(['Latte3₺540,00', 'Su3₺120,00'])
  })

  it('says when nothing was sold today', async () => {
    serve({ todayRevenue: 0, todayOrders: 0, averageBasket: 0, topProducts: [] })
    renderWithProviders(<AdminDashboardPage />)

    expect(await screen.findByText('Bugün henüz satış yok.')).toBeInTheDocument()
  })
})
