import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import './index.css'
import { AppProvider, useAppContext } from './context/AppContext'
import MainLayout from './layouts/MainLayout'
import ApplicationsPage from './pages/Applications/ApplicationsPage'
import ListTogglesPage from './pages/Toggles/List/ListTogglesPage'
import LoginPage from './pages/Login/LoginPage'
import TenantsPage from './pages/Tenants/TenantsPage'

function AppRootLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  )
}

function ProtectedLayout() {
  const { isAuthenticated, isInitialized } = useAppContext()

  if (!isInitialized) {
    return <div>Carregando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout />
}

function LoginRoute() {
  const { isAuthenticated, isInitialized } = useAppContext()

  if (!isInitialized) {
    return <div>Carregando...</div>
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

const router = createBrowserRouter([
  {
    element: <AppRootLayout />,
    children: [
      {
        path: '/login',
        element: <LoginRoute />,
      },
      {
        path: '/',
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            element: <ApplicationsPage />,
          },
          {
            path: 'applications',
            element: <ApplicationsPage />,
          },
          {
            path: 'toggles',
            element: <ListTogglesPage />,
          },
          {
            path: 'tenants',
            element: <TenantsPage />,
          },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
