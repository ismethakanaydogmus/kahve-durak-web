import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_URL } from './api'

/** The slice of a SignalR HubConnection the app uses; tests replace createOrdersConnection with a fake. */
export interface OrdersConnection {
  start(): Promise<void>
  stop(): Promise<void>
  on(event: string, handler: (payload: never) => void): void
  onreconnected(handler: () => void): void
  onclose(handler: () => void): void
}

/**
 * 1s, 2s, 4s … capped at 30s, forever. SignalR's default gives up after ~42s, which is shorter than a
 * Render free-tier cold start, so a kitchen tablet would silently stop receiving orders.
 */
export const reconnectDelayMs = (attempt: number) => Math.min(30_000, 1000 * 2 ** Math.min(attempt, 15))

export function createOrdersConnection(token: string): OrdersConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/orders`, { accessTokenFactory: () => token })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => reconnectDelayMs(ctx.previousRetryCount) })
    .configureLogging(LogLevel.Warning)
    .build()
  return {
    start: () => connection.start(),
    stop: () => connection.stop(),
    on: (event, handler) => connection.on(event, handler),
    onreconnected: (handler) => connection.onreconnected(() => handler()),
    onclose: (handler) => connection.onclose(() => handler()),
  }
}
