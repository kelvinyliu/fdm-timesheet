import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const instance = axios.create({ baseURL: BASE_URL })

export async function apiClient(path, options = {}) {
  const token = localStorage.getItem('token')
  const { body, headers: extraHeaders, method = 'GET', ...rest } = options

  const config = {
    method,
    url: path,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    ...(body !== undefined ? { data: body } : {}),
    ...rest,
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
