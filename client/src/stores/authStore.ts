import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthResponse, UserDto } from '../lib/types'
import { isTokenExpired } from '../lib/jwt'

interface AuthState {
  token: string | null
  user: UserDto | null
  setAuth: (res: AuthResponse) => void
  logout: () => void
}

const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* storage unavailable */ } },
}))

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (res) => set({ token: res.token, user: res.user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth',
      storage: safeStorage,
      // Drop a stored session whose token has already expired instead of greeting the user by name.
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) state.logout()
      },
    },
  ),
)

export const selectIsAdmin = (s: AuthState) => s.user?.role === 'Admin'
