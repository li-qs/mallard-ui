import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Space, Spin, Result } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { getTrace } from '../api/trace'
import { listApps } from '../api/app'
import type { Span } from '../types'
import SpanTree from '../components/SpanTree'
import DuplicateCalls from '../components/DuplicateCalls'
import { formatDuration } from '../utils/format'

export default function TraceDetail() {
  const { traceId } = useParams<{ traceId: string }>()
  const navigate = useNavigate()
  const [spans, setSpans] = useState<Span[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [appMap, setAppMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    listApps(1, 100)
      .then((res) => {
        setAppMap(new Map(res.list.map((a) => [a.id, a.app_name])))
      })
      .catch(() => {
        /* 拉取 App 名称失败时回退显示 app_id */
      })
  }, [])

  useEffect(() => {
    if (!traceId) return
    setLoading(true)
    setFailed(false)
    getTrace(traceId)
      .then(setSpans)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [traceId])

  const summary = useMemo(() => {
    let minStart = Infinity
    let maxEnd = -Infinity
    let hasError = false
    for (const s of spans) {
      if (s.start_time < minStart) minStart = s.start_time
      if (s.start_time + s.duration > maxEnd) maxEnd = s.start_time + s.duration
      if (s.status !== 0) hasError = true
    }
    const totalDuration = minStart === Infinity ? 0 : maxEnd - minStart
    return { spanCount: spans.length, totalDuration, hasError }
  }, [spans])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 600 }}>Trace: {traceId}</span>
      </Space>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        </Card>
      ) : failed ? (
        <Result
          status="error"
          title="Trace 加载失败"
          subTitle="未找到该 trace 或请求出错"
          extra={
            <Button type="primary" onClick={() => navigate('/traces')}>
              返回列表
            </Button>
          }
        />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions
              column={3}
              items={[
                { key: 'span', label: 'span 总数', children: summary.spanCount },
                {
                  key: 'duration',
                  label: '总耗时',
                  children: formatDuration(summary.totalDuration),
                },
                {
                  key: 'error',
                  label: '状态',
                  children: summary.hasError ? (
                    <span style={{ color: '#ff4d4f' }}>错误</span>
                  ) : (
                    <span style={{ color: '#999' }}>正常</span>
                  ),
                },
              ]}
            />
          </Card>
          <SpanTree spans={spans} appMap={appMap} />
          <DuplicateCalls spans={spans} appMap={appMap} />
        </>
      )}
    </div>
  )
}
