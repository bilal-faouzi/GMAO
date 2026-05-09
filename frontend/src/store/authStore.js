import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user, access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user, isAuthenticated: true }),

  hasInterface: (code) => {
    const state = useAuthStore.getState()
    if (!state.user?.interfaces) return false
    return state.user.interfaces.some((i) => i.code === code)
  },

  canAccessRoute: (route) => {
    const state = useAuthStore.getState()
    if (!state.user?.interfaces) return false
    // Exact match or parent route match
    return state.user.interfaces.some((i) => {
      if (i.route === route) return true
      // Allow child routes if parent is accessible
      if (route.startsWith(i.route + '/')) return true
      return false
    })
  },
}))

export default useAuthStore