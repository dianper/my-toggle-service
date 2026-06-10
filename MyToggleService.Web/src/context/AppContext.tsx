import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { getMe, logout } from '../api'

type ThemeMode = 'light' | 'dark'

interface AppContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
  logout: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize theme
  useEffect(() => {
    const stored = localStorage.getItem('mts-theme')
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeState(prefersDark ? 'dark' : 'light')
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mts-theme', theme)
  }, [theme])

  // Initialize authentication on app startup
  useEffect(() => {
    ;(async () => {
      try {
        const currentUser = await getMe()
        if (currentUser) {
          setUser(currentUser)
        } else {
          // Not authenticated, redirect to login
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Failed to get user:', error)
        window.location.href = '/login'
      } finally {
        setIsInitialized(true)
      }
    })()
  }, [])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Even on error, redirect to login
      window.location.href = '/login'
    }
  }

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        user,
        isAuthenticated: user !== null,
        isInitialized,
        logout: handleLogout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
