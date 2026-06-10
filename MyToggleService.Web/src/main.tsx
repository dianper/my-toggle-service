import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom'
import './index.css'
import { AppProvider, useAppContext } from './context/AppContext'
import MainLayout from './layouts/MainLayout'
import ApplicationsPage from './pages/Applications/ApplicationsPage'
import ListTogglesPage from './pages/Toggles/List/ListTogglesPage'
import LoginPage from './pages/Login/LoginPage'

// Protected route component
function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAppContext()

  if (!isInitialized) {
    return <div>Carregando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return element
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AppProvider>
        <MainLayout />
      </AppProvider>
    ),
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
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
