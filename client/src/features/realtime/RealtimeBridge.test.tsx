import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { renderWithProviders } from '../../test/render'
import { useAuthStore } from '../../stores/authStore'
import { createOrdersConnection } from '../../lib/realtime'
import type { OrdersConnection } from '../../lib/realtime'
import { orderAlerts } from '../admin/orderAlert'
import { RealtimeBridge } from './RealtimeBridge'

vi.mock('../../lib/realtime', async (importActual) => ({
  ...(await importActual<typeof import('../../lib/realtime')>()),
  createOrdersConnection: vi.fn(),
}))

type Handler = (payload: unknown) => void

function fakeConnection(startResult: Promise<void> = Promise.resolve()) {
  const handlers = new Map<string, Handler>()
  let reconnected: () => void = () => {}
  let closed: () => void = () => {}
  const connection: OrdersConnection = {
    start: vi.fn(() => startResult),
    stop: vi.fn(() => Promise.resolve()),
    on: vi.fn((evt: string, fn: Handler) => void handlers.set(evt, fn)),
    onreconnected: vi.fn((fn: () => void) => void (reconnected = fn)),
    onclose: vi.fn((fn: () => void) => void (closed = fn)),
  }
  return { connection, emit: (evt: string, payload?: unknown) => handlers.get(evt)?.(payload), reconnect: () => reconnected(), close: () => closed() }
}

const signIn = (role: 'Customer' | 'Admin' = 'Customer') =>
  useAuthStore.getState().setAuth({
    token: 'jwt', user: { id: 1, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role },
  })

function seeded() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const key of [['order', 7], ['order', 8], ['orders'], ['admin', 'orders', 'active'], ['admin', 'dashboard']])
    queryClient.setQueryData(key, { seeded: true })
  return queryClient
}

const invalidated = (qc: QueryClient, key: unknown[]) => qc.getQueryState(key)?.isInvalidated

describe('RealtimeBridge', () => {
  beforeEach(() => vi.mocked(createOrdersConnection).mockReset())

  it('connects only once someone is logged in', async () => {
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    renderWithProviders(<RealtimeBridge />)
    expect(createOrdersConnection).not.toHaveBeenCalled()

    act(() => signIn())

    await waitFor(() => expect(createOrdersConnection).toHaveBeenCalledWith('jwt'))
    expect(fake.connection.start).toHaveBeenCalled()
  })

  it('refreshes the affected order when its status changes', async () => {
    signIn()
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    const queryClient = seeded()
    renderWithProviders(<RealtimeBridge />, { queryClient })
    await waitFor(() => expect(fake.connection.start).toHaveBeenCalled())
    // Connecting refreshes everything; re-seed so only the event's own invalidations show.
    await act(async () => {})
    for (const key of [['order', 7], ['order', 8], ['orders'], ['admin', 'orders', 'active']]) queryClient.setQueryData(key, { seeded: true })

    act(() => fake.emit('OrderStatusChanged', { orderId: 7, status: 'Preparing', at: '2026-10-19T09:05:00Z' }))

    expect(invalidated(queryClient, ['order', 7])).toBe(true)
    expect(invalidated(queryClient, ['orders'])).toBe(true)
    expect(invalidated(queryClient, ['admin', 'orders', 'active'])).toBe(true)
    expect(invalidated(queryClient, ['order', 8])).toBe(false)
  })

  it('raises an alert and refreshes admin lists for a new order', async () => {
    signIn('Admin')
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    const queryClient = seeded()
    const seen: unknown[] = []
    const unsubscribe = orderAlerts.subscribe((o) => seen.push(o))
    renderWithProviders(<RealtimeBridge />, { queryClient })
    await waitFor(() => expect(fake.connection.start).toHaveBeenCalled())

    act(() => fake.emit('OrderCreated', { id: 12, customerName: 'Ayşe Demir', total: 450 }))

    expect(seen).toEqual([{ id: 12, customerName: 'Ayşe Demir', total: 450 }])
    expect(invalidated(queryClient, ['admin', 'orders', 'active'])).toBe(true)
    expect(invalidated(queryClient, ['admin', 'dashboard'])).toBe(true)
    unsubscribe()
  })

  it('refetches everything order-related after reconnecting', async () => {
    signIn()
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    const queryClient = seeded()
    renderWithProviders(<RealtimeBridge />, { queryClient })
    await waitFor(() => expect(fake.connection.start).toHaveBeenCalled())

    act(() => fake.reconnect())

    expect(invalidated(queryClient, ['orders'])).toBe(true)
    expect(invalidated(queryClient, ['order', 8])).toBe(true)
    expect(invalidated(queryClient, ['admin', 'dashboard'])).toBe(true)
  })

  it('disconnects on logout', async () => {
    signIn()
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    renderWithProviders(<RealtimeBridge />)
    await waitFor(() => expect(fake.connection.start).toHaveBeenCalled())

    act(() => useAuthStore.getState().logout())

    await waitFor(() => expect(fake.connection.stop).toHaveBeenCalled())
  })

  it('keeps the page working when the hub is unreachable', async () => {
    signIn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = fakeConnection(Promise.reject(new Error('cold start')))
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)

    renderWithProviders(<RealtimeBridge />)

    await waitFor(() => expect(warn).toHaveBeenCalled())
    warn.mockRestore()
  })
})

describe('RealtimeBridge resilience', () => {
  beforeEach(() => vi.mocked(createOrdersConnection).mockReset())

  it('keeps retrying a failed first connection and refreshes once it connects', async () => {
    vi.useFakeTimers()
    signIn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fake = fakeConnection()
    vi.mocked(fake.connection.start).mockRejectedValueOnce(new Error('asleep')).mockRejectedValueOnce(new Error('asleep'))
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    const queryClient = seeded()
    renderWithProviders(<RealtimeBridge />, { queryClient })

    await act(() => vi.advanceTimersByTimeAsync(60_000))

    expect(fake.connection.start).toHaveBeenCalledTimes(3)
    expect(invalidated(queryClient, ['admin', 'orders', 'active'])).toBe(true)
    warn.mockRestore()
    vi.useRealTimers()
  })

  it('reconnects after the connection closes for good', async () => {
    vi.useFakeTimers()
    signIn()
    const fake = fakeConnection()
    vi.mocked(createOrdersConnection).mockReturnValue(fake.connection)
    renderWithProviders(<RealtimeBridge />)
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(fake.connection.start).toHaveBeenCalledTimes(1)

    act(() => fake.close())
    await act(() => vi.advanceTimersByTimeAsync(60_000))

    expect(fake.connection.start).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('reconnectDelayMs', () => {
  it('backs off but never gives up', async () => {
    const { reconnectDelayMs } = await vi.importActual<typeof import('../../lib/realtime')>('../../lib/realtime')
    const delays = [0, 1, 2, 3, 4, 10, 100].map(reconnectDelayMs)

    expect(delays.every((d) => typeof d === 'number' && d > 0 && d <= 30_000)).toBe(true)
    expect(delays[0]).toBeLessThan(delays[3])
    expect(delays.at(-1)).toBe(30_000)
  })
})
