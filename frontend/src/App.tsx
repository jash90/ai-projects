import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Route, Navigate, useLocation, Routes } from 'react-router-dom'
import { trackPageView } from '@/analytics/posthog'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/stores/authStore'
import { useTheme } from '@/stores/uiStore'
import { authApi } from '@/lib/api'
import { setTheme } from '@/lib/utils'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@/lib/languages'


// Layout Components
import AuthLayout from '@/components/layouts/AuthLayout'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import LanguageLayout from '@/components/layouts/LanguageLayout'

const LandingPage = lazy(() => import('@/pages/LandingPage'))

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

const SuspenseFallback = (
  <div className="flex-1 flex items-center justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
)

/** Redirect from / to the detected language root, e.g. /en/ */
function RootRedirect() {
  const rawLang = (localStorage.getItem('i18nextLng') || navigator.language || DEFAULT_LANGUAGE).split('-')[0]
  const lang = isSupportedLanguage(rawLang) ? rawLang : DEFAULT_LANGUAGE
  return <Navigate to={`/${lang}/`} replace />
}


/** Track SPA page views in PostHog, stripping the lang prefix. */
function PostHogPageTracker() {
  const location = useLocation()
  useEffect(() => {
    const path = location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')
    trackPageView({ path })
  }, [location.pathname])
  return null
}

function App() {
  const { isAuthenticated, setUser, logout } = useAuth()
  const theme = useTheme()

  // Sync theme to DOM — idempotent, safe to call during render
  setTheme(theme)

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
            {/* Root → detect lang → /${lang}/ */}
            <Route path="/" element={<RootRedirect />} />

            {/* ────── Lang-prefixed routes: landing page only ────── */}
            <Route path="/:lang" element={<LanguageLayout />}>
              <Route index element={<Suspense fallback={SuspenseFallback}><LandingPage /></Suspense>} />
              <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
            </Route>

            {/* ────── Non-lang routes ────── */}

            {/* Auth pages */}
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : (
                  <AuthLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <LoginPage />
                    </Suspense>
                  </AuthLayout>
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : (
                  <AuthLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <RegisterPage />
                    </Suspense>
                  </AuthLayout>
                )
              }
            />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : (
                  <DashboardLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <DashboardPage />
                    </Suspense>
                  </DashboardLayout>
                )
              }
            />

            {/* Protected app pages (no lang prefix) */}
            <Route
              path="/projects/:projectId"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : (
                  <DashboardLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <ProjectPage />
                    </Suspense>
                  </DashboardLayout>
                )
              }
            />
            <Route
              path="/settings"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : (
                  <DashboardLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <SettingsPage />
                    </Suspense>
                  </DashboardLayout>
                )
              }
            />
            <Route
              path="/usage"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : (
                  <DashboardLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <UsagePage />
                    </Suspense>
                  </DashboardLayout>
                )
              }
            />
            <Route
              path="/admin"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : (
                  <DashboardLayout>
                    <Suspense fallback={SuspenseFallback}>
                      <AdminPage />
                    </Suspense>
                  </DashboardLayout>
                )
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
