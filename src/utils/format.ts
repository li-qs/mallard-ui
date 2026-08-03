import dayjs from 'dayjs'

export function msToTime(ms: number): string {
  if (!ms || ms <= 0) return '—'
  return dayjs(ms).format('YYYY-MM-DD HH:mm:ss')
}

export function nsToMs(ns: number): number {
  return ns / 1e6
}

export function formatDuration(ns: number): string {
  if (ns < 1e3) return `${Math.round(ns)}ns`
  if (ns < 1e6) return `${(ns / 1e3).toFixed(1)}µs`
  if (ns < 1e9) return `${(ns / 1e6).toFixed(1)}ms`
  return `${(ns / 1e9).toFixed(2)}s`
}
