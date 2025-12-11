import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import config from '../config'

interface User {
  id: number
  email: string
  name: string
  profile_picture_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { getToken, signOut } = useClerkAuth()
  const [backendUser, setBackendUser] = useState<User | null>(null)

  // When Clerk user loads, sync with backend to create database user
  useEffect(() => {
    if (clerkLoaded && clerkUser) {
      syncUserWithBackend()
    } else if (clerkLoaded && !clerkUser) {
      setBackendUser(null)
    }
  }, [clerkUser, clerkLoaded])

  const syncUserWithBackend = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`${config.API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setBackendUser(userData)
      }
    } catch (error) {
      console.error('Failed to sync user with backend:', error)
    }
  }

  // Use backend user if available, otherwise fallback to Clerk user
  const user: User | null =
    backendUser ||
    (clerkUser
      ? {
          id: 0,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          profile_picture_url: clerkUser.imageUrl,
        }
      : null)

  const logout = () => {
    setBackendUser(null)
    signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null, // Token is managed by Clerk internally
        logout,
        isLoading: !clerkLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export a helper to get Clerk token for API calls
export async function getAuthToken(): Promise<string | null> {
  // This will be called from components that need to make authenticated API calls
  // Clerk's useAuth hook provides getToken method
  return null // Components should use useAuth from @clerk/clerk-react directly
}
