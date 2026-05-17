/** 后端统一响应结构 */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

export class ApiError extends Error {
  readonly code: number
  readonly raw?: unknown

  constructor(code: number, message: string, raw?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.raw = raw
  }
}
