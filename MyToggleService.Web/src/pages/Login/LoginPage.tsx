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
          <h1>Fortytwo Toggle Service</h1>
          <p className="login-subtitle">Feature Toggle Management</p>

          {errorParam || error ? (
            <div className="error-message">
              <p>Authentication failed. Please try again.</p>
              <code>{errorParam || error}</code>
            </div>
          ) : null}

          <div className="login-content">
            <p className="login-description">
              Sign in with your corporate account to access the service
            </p>

            <button
              className="login-button"
              onClick={handleLoginClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Redirecting...
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
                  Sign in with Microsoft
                </>
              )}
            </button>
          </div>

          <footer className="login-footer">
            <p>Only @labs.fortytwo.io accounts are allowed</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
