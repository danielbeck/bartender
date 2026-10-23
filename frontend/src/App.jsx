
import { useState, useEffect } from 'react'
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { fetchAPI } from './api'
import AuthPage from './components/AuthPage'
import ProfilePage from './components/ProfilePage'
import PasswordRecoveryPage from './components/PasswordRecoveryPage'
import CocktailLibrary from './components/CocktailLibrary'
import Laboratory from './components/Laboratory'
import './global.scss'


function App() {
  const [user, setUser] = useState(null)
  const [userLoading, setUserLoading] = useState(true)
  const navigate = useNavigate();
  const location = useLocation()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const data = await fetchAPI('/auth/me', { credentials: 'include' })
      setUser(data.user)
    } catch (err) {
      setUser(null)
    } finally {
      setUserLoading(false)
    }
  }

  const handleAuth = (data) => {
    setUser(data.email || data.user)
  }

  const handleLogout = async () => {
    await fetchAPI('/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    navigate('/')
  }

  return (
    <div className="App">
      <header className="App-header">
        {(user || location.pathname.replace(/\/+$/, '') !== '/auth') && (
          <Link className="auth-link" to={user ? '/profile' : '/auth'}
            aria-label={user ? 'Your profile' : 'Log in or register'}
            title={user ? 'Your profile' : 'Log in or register'}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
            </svg>
          </Link>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/auth" element={<AuthPage onAuth={handleAuth} />} />
          <Route path="/forgot-password" element={<PasswordRecoveryPage key="forgot" />} />
          <Route path="/reset-password" element={<PasswordRecoveryPage key="reset" reset onReset={() => setUser(null)} />} />
          <Route path="/profile" element={userLoading
            ? <section className="auth-page"><p role="status">Loading your profile...</p></section>
            : user ? <ProfilePage user={user} onLogout={handleLogout} />
              : <Navigate to="/auth" replace />} />
          <Route path="/" element={<Navigate to={`/cocktails${location.search}`} replace />} />
          <Route path="/cocktails" element={<CocktailLibrary user={user} />} />
          <Route path="/cocktails/:cocktailId" element={<CocktailLibrary user={user} />} />
          <Route path="/lab" element={<Laboratory />} />
          <Route path="/laboratory" element={<Navigate to={`/lab${location.search}${location.hash}`} replace />} />
          <Route path="*" element={<div className="cocktail-library"><h1>Page not found</h1><Link to="/cocktails">Back to the cocktails</Link></div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
