import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const instance = axios.create({ baseURL: BASE_URL })

function serializeBody(body) {
  if (body === undefined || body === null) return body
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body
  }
  return JSON.stringify(body)
}

export async function apiClient(path, options = {}) {
  const token = localStorage.getItem('token')
  const { body, headers: extraHeaders, method = 'GET', ...rest } = options
  const serializedBody = serializeBody(body)

  const config = {
    method,
    url: path,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...(serializedBody !== undefined ? { data: serializedBody } : {}),
    ...rest,
  }

  if (
    serializedBody !== undefined &&
    !(serializedBody instanceof FormData) &&
    !(serializedBody instanceof Blob) &&
    !(serializedBody instanceof ArrayBuffer)
  ) {
    config.headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await instance(config)
    return response.status === 204 ? null : response.data
  } catch (err) {
    const response = err.response
    const errorBody = response?.data || { message: err.message || 'Network error' }
    const error = new Error(errorBody.error || errorBody.message || 'Request failed')
    error.status = response?.status ?? 0
    error.body = errorBody
    throw error
  }
}
