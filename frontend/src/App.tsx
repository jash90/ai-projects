import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Route, Navigate, useLocation } from 'react-router-dom'
import { SentryRoutes as Routes } from '@/analytics/sentry'
import { trackPageView } from '@/analytics/posthog'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/stores/authStore'
import { useTheme } from '@/stores/uiStore'
import { useSocket } from '@/hooks/useSocket'
import { authApi } from '@/lib/api'
import { setTheme } from '@/lib/utils'

// Layout Components
import AuthLayout from '@/components/layouts/AuthLayout'
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Static import for LandingPage (first paint)
import LandingPage from '@/pages/LandingPage'

// Lazy-loaded page components (code splitting)
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProjectPage = lazy(() => import('@/pages/ProjectPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const UsagePage = lazy(() => import('@/pages/UsagePage').then(m => ({ default: m.UsagePage })))
const AdminPage = lazy(() => import('@/pages/AdminPage'))

// UI Components
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'

/** Track SPA page views in PostHog on route changes */
function PostHogPageTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView({ path: location.pathname })
  }, [location.pathname])
  return null
}

function App() {
  const { isAuthenticated, user, setUser, logout } = useAuth()
  const theme = useTheme()
  useSocket()

  // Initialize theme
  useEffect(() => {
    setTheme(theme)
  }, [theme])

  // Verify authentication in background — trust cached auth for initial render.
  // If token is invalid, logout() is called and user is redirected.
  useQuery({
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

  return (
    <ErrorBoundary>
      <Router>
        <PostHogPageTracker />
        <div className="min-h-screen bg-background text-foreground">
          <Routes>
            {/* Landing Page - Always accessible (static import, no Suspense needed) */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Routes */}
            {!isAuthenticated ? (
              <>
                <Route
                  path="/login"
                  element={
                    <AuthLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <LoginPage />
                      </Suspense>
                    </AuthLayout>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <AuthLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <RegisterPage />
                      </Suspense>
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
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <DashboardPage />
                      </Suspense>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/projects/:projectId"
                  element={
                    <DashboardLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <ProjectPage />
                      </Suspense>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <DashboardLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <SettingsPage />
                      </Suspense>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/usage"
                  element={
                    <DashboardLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <UsagePage />
                      </Suspense>
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <DashboardLayout>
                      <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
                        <AdminPage />
                      </Suspense>
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
