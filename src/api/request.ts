import { getStoredToken } from './token'
import { ApiError, type ApiResponse } from './types'

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  /** JSON 请求体，自动序列化 */
  body?: unknown
  /** 查询参数 */
  params?: Record<string, string | number | boolean | undefined>
  /** 为 false 时不按业务 code 校验（默认 true） */
  unwrap?: boolean
  /** 为 true 时不附带 Authorization（登录、验证码等） */
  skipAuth?: boolean
}

function buildUrl(path: string, params?: RequestConfig['params']) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const isAbsoluteBase = /^https?:\/\//i.test(base)

  const url = isAbsoluteBase
    ? new URL(`${base}${normalizedPath}`)
    : new URL(`${base}${normalizedPath}`, window.location.origin)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

function mergeHeaders(init?: HeadersInit, skipAuth?: boolean): Headers {
  const headers = new Headers(init)
  if (!headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  if (!skipAuth) {
    const token = getStoredToken()
    if (token && !headers.has('Authorization'))
      headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

/**
 * 统一 HTTP 请求：拼接 baseURL、JSON 序列化、业务 code 校验
 */
export async function request<T>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const { body, params, unwrap = true, skipAuth = false, headers, ...init } = config

  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      ...init,
      headers: mergeHeaders(headers, skipAuth),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    throw new ApiError(-1, message, error)
  }

  let payload: ApiResponse<T>
  try {
    payload = await response.json() as ApiResponse<T>
  }
  catch {
    throw new ApiError(
      response.status,
      response.ok ? '响应解析失败' : `HTTP ${response.status}`,
    )
  }

  if (!response.ok) {
    throw new ApiError(
      payload.code ?? response.status,
      payload.msg || `HTTP ${response.status}`,
      payload,
    )
  }

  if (!unwrap)
    return payload as unknown as T

  if (payload.code !== 0) {
    throw new ApiError(payload.code, payload.msg || '请求失败', payload)
  }

  return payload.data
}

export function get<T>(path: string, config?: Omit<RequestConfig, 'body'>) {
  return request<T>(path, { ...config, method: 'GET' })
}

export function post<T>(path: string, body?: unknown, config?: RequestConfig) {
  return request<T>(path, { ...config, method: 'POST', body })
}
