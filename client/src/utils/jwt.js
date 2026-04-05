export function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function isJwtExpired(payload) {
  if (!payload || !payload.exp) return false
  return Date.now() / 1000 > payload.exp
}
