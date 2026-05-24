import { post } from './request'
import {
  clearAuthToken,
  getStoredToken,
  getStoredUser,
  isTokenValid,
  saveAuthToken,
  type StoredAuthUser,
} from './token'

export type { StoredAuthUser }

export interface LoginParams {
  username: string
  password: string
  captcha?: string
  captcha_id?: string
}

export interface LoginResult {
  uid: number
  username: string
  token: string
  expire_time: number
}

export interface GetCaptchaResult {
  captcha_pic: string
  captcha_id: string
  captch_length: number
}

export { getStoredToken, getStoredUser }

export function setAuthSession(data: LoginResult) {
  saveAuthToken(data.token, {
    uid: data.uid,
    username: data.username,
    expire_time: data.expire_time,
  })
}

export function clearAuthSession() {
  clearAuthToken()
}

export function isAuthenticated() {
  return isTokenValid()
}

/** POST /account/v1/login */
export function login(params: LoginParams) {
  return post<LoginResult>('/account/v1/login', params)
}

/** POST /account/v1/get_captcha */
export function getCaptcha() {
  return post<GetCaptchaResult>('/account/v1/get_captcha', {})
}

export function captchaImageSrc(pic: string) {
  if (!pic)
    return ''
  if (pic.startsWith('data:'))
    return pic
  return `data:image/png;base64,${pic}`
}
