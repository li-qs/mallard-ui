import http, { refreshToken } from './http'
import type {
  LoginReq,
  LoginRes,
  UpdatePasswordReq,
  User,
} from '../types'

export function login(data: LoginReq): Promise<LoginRes> {
  return http.post('/login', data)
}

export function logout(): Promise<string> {
  return http.post('/logout')
}

export { refreshToken as refresh }

export function getUser(): Promise<User> {
  return http.get('/user')
}

export function updatePassword(data: UpdatePasswordReq): Promise<string> {
  return http.put('/user/password', data)
}
