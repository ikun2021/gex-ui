const TOKEN_KEY = 'gex_token'
const AUTH_USER_KEY = 'gex_auth_user'

export interface StoredAuthUser {
  uid: number
  username: string
  expire_time: number
}

export function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined')
    return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): StoredAuthUser | null {
  if (typeof localStorage === 'undefined')
    return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as StoredAuthUser
  }
  catch {
    return null
  }
}

export function saveAuthToken(token: string, user: StoredAuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function isTokenValid() {
  const token = getStoredToken()
  if (!token)
    return false
  const user = getStoredUser()
  if (user?.expire_time && user.expire_time * 1000 <= Date.now()) {
    clearAuthToken()
    return false
  }
  return true
}
