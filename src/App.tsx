import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useUserStore } from './store/userStore'
import { useLineLiff } from './hooks/useLineLiff'
import Layout from './components/layout/Layout'
import LoadingSpinner from './components/common/LoadingSpinner'
import ErrorBoundary from './components/common/ErrorBoundary'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const LoginPage = lazy(() => import('./features/auth/Login'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  const { user, setUser, isLoading } = useUserStore()
  const { initLiff } = useLineLiff()

  useEffect(() => {
    const initialize = async () => {
      try {
        await initLiff()
      } catch (error) {
        console.error('Failed to initialize LIFF:', error)
      }
    }
    
    initialize()
  }, [initLiff])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/*" 
              element={
                user?.is_admin ? <AdminPage /> : <Navigate to="/" replace />
              } 
            />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
