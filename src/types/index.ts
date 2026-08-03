export interface ApiResponse<T> {
  code: number
  message?: string
  data: T
}

export interface ListData<T> {
  page: number
  page_size: number
  total: number
  list: T[]
}

// ---- auth ----
export interface LoginReq {
  username: string
  password: string
}

export interface LoginRes {
  access_token: string
  token_type: string
  expires_in: number
}

export interface UpdatePasswordReq {
  password: string
  new_password: string
}

// ---- user ----
export interface User {
  id: string
  username: string
  created_at: number
  updated_at: number
}

// ---- app ----
export interface AddAppReq {
  app_name: string
  ip_allow_list?: string[]
}

export interface App {
  id: string
  app_name: string
  ip_allow_list: string[]
  created_at: number
  updated_at: number
}

export interface AppAddRes {
  id: string
  app_name: string
  secret: string
  ip_allow_list: string[]
}

export interface AppSecretRes {
  id: string
  secret: string
}

// ---- span ----
export interface Span {
  id: string
  app_id: string
  trace_id: string
  span_id: string
  parent_id: string
  is_root: boolean
  operation: string
  start_time: number
  duration: number
  status: number
  error?: string
  reported_at: number
}

export interface TraceSummary {
  trace_id: string
  app_ids: string[]
  operation: string
  start_time: number
  duration: number
  span_count: number
  error_count: number
  has_error: boolean
}

// ---- search params ----
export interface TraceSearchParams {
  app_id?: string
  operation?: string
  status?: number
  trace_id?: string
  start_time_gt?: number
  start_time_lt?: number
  page?: number
  page_size?: number
}
