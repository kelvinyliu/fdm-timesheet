import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthContext } from './useAuth.js'

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}

function isTokenExpired(payload) {
  if (!payload || !payload.exp) return false
  return Date.now() / 1000 > payload.exp
}

function getStoredAuth() {
  const stored = localStorage.getItem('token')
  if (!stored) return { token: null, user: null }
  const payload = decodeToken(stored)
  if (payload && !isTokenExpired(payload)) return { token: stored, user: payload }
  localStorage.removeItem('token')
  return { token: null, user: null }
}

export function AuthProvider({ children }) {
  const [{ token: initToken, user: initUser }] = useState(getStoredAuth)
  const [token, setToken] = useState(initToken)
  const [user, setUser] = useState(initUser)
  const navigate = useNavigate()

  function login(newToken, userFromResponse) {
    const payload = decodeToken(newToken)
    if (!payload) return
    localStorage.setItem('token', newToken)
    setToken(newToken)
    // Use the response body user object (camelCase DTOs) if provided,
    // otherwise fall back to the JWT payload for backward compatibility
    setUser(userFromResponse ?? payload)
  }

  function logout() {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

