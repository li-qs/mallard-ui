import http from './http'
import type {
  AddAppReq,
  App,
  AppAddRes,
  AppSecretRes,
  ListData,
} from '../types'

export function addApp(data: AddAppReq): Promise<AppAddRes> {
  return http.post('/app', data)
}

export interface AppListParams {
  app_name?: string
  id?: string
}

export function listApps(
  page: number,
  pageSize: number,
  filters?: AppListParams,
): Promise<ListData<App>> {
  return http.get('/app', {
    params: { page, page_size: pageSize, ...filters },
  })
}

export function updateIpAllowList(id: string, ipAllowList: string[]): Promise<string> {
  return http.put(`/app/${id}/ip-allow-list`, { ip_allow_list: ipAllowList })
}

export function rotateSecret(id: string): Promise<AppSecretRes> {
  return http.put(`/app/${id}/secret`)
}

export function deleteApp(id: string): Promise<string> {
  return http.delete(`/app/${id}`)
}
