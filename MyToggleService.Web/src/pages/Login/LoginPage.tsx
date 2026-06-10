import { useState } from 'react'
import './LoginPage.css'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoginClick = () => {
    setIsLoading(true)
    setError(null)
    
    // Redirect to backend OAuth signin endpoint
    window.location.href = '/auth/signin'
  }

  // Check for error in URL params
  const searchParams = new URLSearchParams(window.location.search)
  const errorParam = searchParams.get('error')

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Toggle Service</h1>
          <p className="login-subtitle">Gerenciador de Feature Toggles</p>

          {errorParam || error ? (
            <div className="error-message">
              <p>Falha na autenticação. Tente novamente.</p>
              <code>{errorParam || error}</code>
            </div>
          ) : null}

          <div className="login-content">
            <p className="login-description">
              Entre com sua conta corporativa para acessar o serviço
            </p>

            <button
              className="login-button"
              onClick={handleLoginClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Redirecionando...
                </>
              ) : (
                <>
                  <svg
                    className="microsoft-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                  </svg>
                  Login com Microsoft
                </>
              )}
            </button>
          </div>

          <footer className="login-footer">
            <p>Apenas contas @labs.fortytwo.io são permitidas</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
