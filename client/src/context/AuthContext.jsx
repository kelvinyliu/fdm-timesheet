import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthContext } from './useAuth.js'
import { decodeJwtPayload, isJwtExpired } from '../utils/jwt.js'

const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'auth_user'

function getStoredUser() {
  const rawUser = localStorage.getItem(AUTH_USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

function getUserId(user) {
  return user?.id ?? user?.userId ?? null
}

function isStoredUserCompatible(storedUser, payload) {
  if (!storedUser || !payload) return false
  return getUserId(storedUser) === payload.userId && storedUser.role === payload.role
}

function getStoredAuth() {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!storedToken) {
    localStorage.removeItem(AUTH_USER_KEY)
    return { token: null, user: null }
  }

  const payload = decodeJwtPayload(storedToken)
  if (!payload || isJwtExpired(payload)) {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    return { token: null, user: null }
  }

  const storedUser = getStoredUser()
  if (isStoredUserCompatible(storedUser, payload)) {
    return { token: storedToken, user: storedUser }
  }

  localStorage.removeItem(AUTH_USER_KEY)
  return { token: storedToken, user: payload }
}

function persistAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function AuthProvider({ children }) {
  const [{ token: initToken, user: initUser }] = useState(getStoredAuth)
  const [token, setToken] = useState(initToken)
  const [user, setUser] = useState(initUser)
  const navigate = useNavigate()

  function login(newToken, userFromResponse) {
    const payload = decodeJwtPayload(newToken)
    if (!payload) return

    const nextUser = userFromResponse ?? payload
    persistAuth(newToken, nextUser)
    setToken(newToken)
    setUser(nextUser)
  }

  function logout() {
    clearAuth()
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
