import http from './http'
import type { ListData, Span, TraceSearchParams, TraceSummary } from '../types'

export function searchTraces(params: TraceSearchParams): Promise<ListData<TraceSummary>> {
  return http.get('/traces', { params })
}

export function getTrace(traceId: string): Promise<Span[]> {
  return http.get(`/traces/${traceId}`)
}
