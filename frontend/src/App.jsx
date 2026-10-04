
import { useState, useEffect } from 'react'
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { fetchAPI } from './api'
import AuthPage from './components/AuthPage'
import CocktailLibrary from './components/CocktailLibrary'
import './global.scss'


function App() {
  const [user, setUser] = useState(null)
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
    }
  }

  const handleAuth = (data) => {
    setUser(data.username || data.user)
  }

  const handleLogout = async () => {
    await fetchAPI('/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    navigate('/')
  }

  return (
    <div className="App">
      <header className="App-header">
        {user ? (
          <>
            <span className="user-status">Logged in as <b>{user}</b></span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link className="auth-link" to="/auth">Go to Auth Page</Link>
        )}
      </header>

      <main>
        <Routes>
          <Route path="/auth" element={<AuthPage onAuth={handleAuth} />} />
          <Route path="/" element={<Navigate to={`/cocktails${location.search}`} replace />} />
          <Route path="/cocktails" element={<CocktailLibrary />} />
          <Route path="/cocktails/:cocktailId" element={<CocktailLibrary />} />
          <Route path="*" element={<div className="cocktail-library"><h1>Page not found</h1><Link to="/cocktails">Back to cocktail library</Link></div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
