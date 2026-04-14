import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredAuth,
  getStoredAuthToken,
  getStoredAuthUser,
  persistStoredAuth,
} from './authStorage.js'

const storageState = {}

function createStorageMock() {
  return {
    getItem(key) {
      return Object.hasOwn(storageState, key) ? storageState[key] : null
    },
    setItem(key, value) {
      storageState[key] = String(value)
    },
    removeItem(key) {
      delete storageState[key]
    },
  }
}

describe('auth storage utilities', () => {
  beforeEach(() => {
    for (const key of Object.keys(storageState)) {
      delete storageState[key]
    }

    vi.stubGlobal('localStorage', createStorageMock())
  })

  it('persists and retrieves auth token and user details', () => {
    persistStoredAuth('token-123', { id: 'user-1', role: 'CONSULTANT' })

    expect(getStoredAuthToken()).toBe('token-123')
    expect(getStoredAuthUser()).toEqual({ id: 'user-1', role: 'CONSULTANT' })
  })

  it('clears invalid stored users and returns null', () => {
    localStorage.setItem('auth_user', '{invalid-json')

    expect(getStoredAuthUser()).toBeNull()
    expect(localStorage.getItem('auth_user')).toBeNull()
  })

  it('removes both auth keys when cleared', () => {
    persistStoredAuth('token-123', { id: 'user-1' })

    clearStoredAuth()

    expect(getStoredAuthToken()).toBeNull()
    expect(getStoredAuthUser()).toBeNull()
  })
})
