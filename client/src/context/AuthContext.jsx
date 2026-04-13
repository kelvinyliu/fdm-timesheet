import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AuthContext } from './useAuth.js'
import { decodeJwtPayload, isJwtExpired } from '../utils/jwt.js'
import {
  clearStoredAuth,
  getStoredAuthToken,
  getStoredAuthUser,
  persistStoredAuth,
} from '../utils/authStorage.js'

function getUserId(user) {
  return user?.id ?? user?.userId ?? null
}

function isStoredUserCompatible(storedUser, payload) {
  if (!storedUser || !payload) return false
  return getUserId(storedUser) === payload.userId && storedUser.role === payload.role
}

function getStoredAuth() {
  const storedToken = getStoredAuthToken()
  if (!storedToken) {
    clearStoredAuth()
    return { token: null, user: null }
  }

  const payload = decodeJwtPayload(storedToken)
  if (!payload || isJwtExpired(payload)) {
    clearStoredAuth()
    return { token: null, user: null }
  }

  const storedUser = getStoredAuthUser()
  if (isStoredUserCompatible(storedUser, payload)) {
    return { token: storedToken, user: storedUser }
  }

  clearStoredAuth()
  persistStoredAuth(storedToken, payload)
  return { token: storedToken, user: payload }
}

export function AuthProvider({ children }) {
  const [{ token: initToken, user: initUser }] = useState(getStoredAuth)
  const [token, setToken] = useState(initToken)
  const [user, setUser] = useState(initUser)
  const navigate = useNavigate()

  const login = useCallback((newToken, userFromResponse) => {
    const payload = decodeJwtPayload(newToken)
    if (!payload) return

    const nextUser = userFromResponse ?? payload
    persistStoredAuth(newToken, nextUser)
    setToken(newToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
    navigate('/login')
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
    }),
    [user, token, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
