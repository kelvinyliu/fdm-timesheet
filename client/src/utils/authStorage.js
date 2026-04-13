const AUTH_TOKEN_KEY = 'token'
const AUTH_USER_KEY = 'auth_user'

export function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredAuthUser() {
  const rawUser = localStorage.getItem(AUTH_USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function persistStoredAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}
