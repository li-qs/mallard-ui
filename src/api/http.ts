import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { message } from 'antd'
import { useAuthStore } from '../store/auth'
import type { ApiResponse, LoginRes } from '../types'

const baseURL: string =
  import.meta.env.VITE_API_BASE_URL || '/api'

const http = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
})

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

function isPublicUrl(url: string): boolean {
  return url.includes('/login') || url.includes('/refresh') || url.includes('/logout')
}

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 独立实例：不带拦截器，仅供 refresh 使用，避免 401 递归刷新
const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
})

let refreshingPromise: Promise<string> | null = null

function forceLogout() {
  useAuthStore.getState().clear()
  message.warning('登录已过期')
  const { pathname, search } = window.location
  const target = pathname.startsWith('/login')
    ? '/login'
    : `/login?redirect=${encodeURIComponent(pathname + search)}`
  window.location.replace(target)
}

export async function refreshToken(): Promise<string> {
  if (!refreshingPromise) {
    refreshingPromise = refreshClient
      .post<ApiResponse<LoginRes>>('/refresh')
      .then((res) => {
        if (res.data.code !== 0 || !res.data.data?.access_token) {
          throw new Error(res.data.message || 'refresh failed')
        }
        const data = res.data.data
        useAuthStore.getState().setToken(data.access_token)
        return data.access_token
      })
      .catch((err) => {
        forceLogout()
        throw err
      })
      .finally(() => {
        refreshingPromise = null
      })
  }
  return refreshingPromise
}

// 认证失效（HTTP 401 或 body.code === 401）统一处理：先刷新重试一次，仍失败则强制登出
async function handleAuthExpired(config?: RetryConfig): Promise<unknown> {
  if (config && !config._retried) {
    config._retried = true
    try {
      const newToken = await refreshToken()
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${newToken}`
      return http.request(config)
    } catch {
      // refreshToken 失败时已触发 forceLogout
      return Promise.reject(new Error('登录已过期'))
    }
  }
  forceLogout()
  return Promise.reject(new Error('登录已过期'))
}

function handleHttpError(status: number | undefined, url: string, err: AxiosError) {
  if (url.includes('/logout')) {
    return
  }
  const body = err.response?.data as ApiResponse<unknown> | undefined
  switch (status) {
    case 401:
      message.error('认证已失效，请重新登录')
      break
    case 403:
      message.error('无权限执行该操作')
      break
    case 429:
      message.error(body?.message || '请求过于频繁，请稍后再试')
      break
    case 400:
      message.error(body?.message || '请求参数有误')
      break
    default:
      if (status && status >= 500) {
        message.error('服务器错误，请稍后再试')
      } else {
        message.error('网络异常，请检查后端服务是否启动')
      }
  }
}

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body.code === 'number' && body.code !== 0) {
      const url = response.config?.url || ''
      if (body.code === 401 && !isPublicUrl(url)) {
        return handleAuthExpired(
          response.config as RetryConfig,
        ) as Promise<typeof response>
      }
      const msg = body.message || '请求失败'
      if (!isPublicUrl(url)) {
        message.error(msg)
      }
      return Promise.reject(new Error(msg))
    }
    return body.data as unknown as typeof response
  },
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as RetryConfig | undefined
    const url = config?.url || ''

    if (status === 401 && !isPublicUrl(url)) {
      return handleAuthExpired(config)
    }

    handleHttpError(status, url, error)
    return Promise.reject(error)
  },
)

export default http
