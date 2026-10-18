import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createOrdersConnection, reconnectDelayMs } from '../../lib/realtime'
import type { AdminOrderSummaryDto, OrderStatusChangedDto } from '../../lib/types'
import { useAuthStore } from '../../stores/authStore'
import { orderAlerts } from '../admin/orderAlert'

const orderRelated = new Set(['orders', 'order', 'admin'])

/** Keeps order screens live: hub events invalidate the matching queries. Renders nothing. */
export function RealtimeBridge() {
  const token = useAuthStore((s) => s.token)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) return
    const connection = createOrdersConnection(token)
    let stopped = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    // Events sent while not connected are lost, so refetch anything they could have changed.
    const refreshAll = () =>
      void queryClient.invalidateQueries({ predicate: (q) => orderRelated.has(String(q.queryKey[0])) })

    const connect = () => {
      connection.start().then(
        () => {
          attempt = 0
          refreshAll()
        },
        (error: unknown) => {
          if (stopped) return
          if (attempt === 0) console.warn('Live order updates are unavailable; retrying.', error)
          retryTimer = setTimeout(connect, reconnectDelayMs(attempt++))
        },
      )
    }

    connection.on('OrderStatusChanged', (e: OrderStatusChangedDto) => {
      void queryClient.invalidateQueries({ queryKey: ['order', e.orderId] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'order', e.orderId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    })
    connection.on('OrderCreated', (order: AdminOrderSummaryDto) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      orderAlerts.emit(order)
    })
    connection.onreconnected(refreshAll)
    // Automatic reconnect gave up or the server closed us (e.g. token expired): start over unless we're done.
    connection.onclose(() => {
      if (!stopped) retryTimer = setTimeout(connect, reconnectDelayMs(attempt++))
    })

    connect()
    return () => {
      stopped = true
      clearTimeout(retryTimer)
      void connection.stop()
    }
  }, [token, queryClient])

  return null
}
