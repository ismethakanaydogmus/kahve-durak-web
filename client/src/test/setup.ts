import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './server'
import i18n from '../i18n'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  useAuthStore.setState({ token: null, user: null })
  useCartStore.setState({ lines: [] })
  await i18n.changeLanguage('tr')
})
afterAll(() => server.close())

// jsdom lacks these browser APIs; Embla Carousel and scroll code need them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })
}
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

// jsdom has <dialog> but not its modal API.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
