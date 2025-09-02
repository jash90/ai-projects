import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/stores/authStore'
import { useTheme } from '@/stores/uiStore'
import { useSocket } from '@/hooks/useSocket'
import { authApi } from '@/lib/api'
import { setTheme } from '@/lib/utils'

// Layout Components
import AuthLayout from '@/components/layouts/AuthLayout'
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Page Components
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectPage from '@/pages/ProjectPage'
import SettingsPage from '@/pages/SettingsPage'
import { UsagePage } from '@/pages/UsagePage'
import AdminPage from '@/pages/AdminPage'

// UI Components
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'

function App() {
  const { isAuthenticated, setUser, logout } = useAuth()
  const theme = useTheme()
  useSocket()

  // Initialize theme
  useEffect(() => {
    setTheme(theme)
  }, [theme])

  // Verify authentication on app start
  const { isLoading: isVerifyingAuth } = useQuery({
    queryKey: ['auth', 'verify'],
    queryFn: async () => {
      try {
        const response = await authApi.verifyToken()
        if (response.success && response.data) {
          setUser(response.data.user)
          return response.data
        } else {
          logout()
          return null
        }
      } catch (error) {
        logout()
        throw error
      }
    },
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Show loading spinner while verifying authentication
  if (isAuthenticated && isVerifyingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background text-foreground">
          <Routes>
            {/* Landing Page - Always accessible */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public Routes */}
            {!isAuthenticated ? (
              <>
                <Route
                  path="/login"
                  element={
                    <AuthLayout>
                      <LoginPage />
                    </AuthLayout>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <AuthLayout>
                      <RegisterPage />
                    </AuthLayout>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              /* Protected Routes */
              <>
                <Route
                  path="/dashboard"
                  element={
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/projects/:projectId"
                  element={
                    <DashboardLayout>
                      <ProjectPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <DashboardLayout>
                      <SettingsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/usage"
                  element={
                    <DashboardLayout>
                      <UsagePage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <DashboardLayout>
                      <AdminPage />
                    </DashboardLayout>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App