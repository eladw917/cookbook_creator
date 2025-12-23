import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import config from '../config'
import LandingPage from './LandingPage'

export default function HomeRoute() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useClerkAuth()
  const [hasRecipes, setHasRecipes] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkRecipes = async () => {
      if (!isLoaded) {
        return
      }

      if (!isSignedIn) {
        setHasRecipes(false)
        setIsChecking(false)
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          setHasRecipes(false)
          setIsChecking(false)
          return
        }

        const response = await fetch(`${config.API_BASE_URL}/api/recipes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setHasRecipes(data.recipes && data.recipes.length > 0)
        } else {
          setHasRecipes(false)
        }
      } catch (error) {
        console.error('Failed to check recipes:', error)
        setHasRecipes(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkRecipes()
  }, [isSignedIn, isLoaded, getToken])

  // Show loading while checking
  if (isChecking || !isLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div className="spinner"></div>
      </div>
    )
  }

  // If user is logged in and has recipes, redirect to recipes page
  if (isSignedIn && hasRecipes) {
    return <Navigate to="/recipes" replace />
  }

  // Otherwise, show landing page
  return <LandingPage />
}


