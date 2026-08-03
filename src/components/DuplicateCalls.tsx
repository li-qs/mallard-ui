import { useMemo } from 'react'
import { Collapse, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Span } from '../types'
import { formatDuration, msToTime, nsToMs } from '../utils/format'

interface DupGroup {
  key: string
  appId: string
  operation: string
  spans: Span[]
  avgDuration: number
  maxDuration: number
  errorCount: number
}

function isError(span: Span): boolean {
  return span.status !== 0 || Boolean(span.error)
}

function buildGroups(spans: Span[]): DupGroup[] {
  const map = new Map<string, DupGroup>()
  for (const s of spans) {
    const key = `${s.app_id}|${s.operation}`
    const g = map.get(key)
    if (g) {
      g.spans.push(s)
    } else {
      map.set(key, {
        key,
        appId: s.app_id,
        operation: s.operation,
        spans: [s],
        avgDuration: 0,
        maxDuration: 0,
        errorCount: 0,
      })
    }
  }

  const groups = [...map.values()].filter((g) => g.spans.length > 1)
  for (const g of groups) {
    g.maxDuration = Math.max(...g.spans.map((s) => s.duration))
    g.avgDuration =
      g.spans.reduce((sum, s) => sum + s.duration, 0) / g.spans.length
    g.errorCount = g.spans.filter((s) => isError(s)).length
    g.spans.sort((a, b) => a.start_time - b.start_time)
  }
  groups.sort(
    (a, b) =>
      b.spans.length - a.spans.length || b.maxDuration - a.maxDuration,
  )
  return groups
}

export default function DuplicateCalls({
  spans,
  appMap,
}: {
  spans: Span[]
  appMap?: Map<string, string>
}) {
  const { groups, spanMap } = useMemo(() => {
    const map = new Map<string, Span>()
    for (const s of spans) map.set(s.span_id, s)
    return { groups: buildGroups(spans), spanMap: map }
  }, [spans])

  const spanColumns: ColumnsType<Span> = [
    {
      title: '调用链',
      key: 'chain',
      render: (_, span) => {
        const chain: Span[] = []
        let cur: Span | undefined = span
        while (cur) {
          chain.unshift(cur)
          cur =
            cur.parent_id && spanMap.get(cur.parent_id)
              ? spanMap.get(cur.parent_id)
              : undefined
        }
        return (
          <span style={{ display: 'block', lineHeight: 1.8 }}>
            {chain.map((s, i) => (
              <span
                key={s.span_id}
                style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
              >
                {i > 0 && (
                  <span style={{ color: '#95abd7', margin: '0 4px' }}>→</span>
                )}
                <span
                  style={{
                    fontWeight: i === chain.length - 1 ? 600 : 400,
                    color: i === chain.length - 1 ? '#ee9627' : undefined,
                  }}
                >
                  {s.operation}
                </span>
              </span>
            ))}
          </span>
        )
      },
    },
    {
      title: '开始时间',
      key: 'start',
      width: 180,
      render: (_, span) => msToTime(nsToMs(span.start_time)),
    },
    {
      title: '耗时',
      key: 'duration',
      width: 120,
      render: (_, span) => formatDuration(span.duration),
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: (_, span) =>
        isError(span) ? (
          <span style={{ color: '#ff4d4f' }}>错误 [{span.status || '—'}]</span>
        ) : (
          <span style={{ color: '#999' }}>正常</span>
        ),
    },
    {
      title: '错误信息',
      key: 'error',
      render: (_, span) =>
        span.error ? (
          <Tooltip title={span.error}>
            <span
              style={{
                color: '#ff4d4f',
                display: 'inline-block',
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
            >
              {span.error}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: '#999' }}>—</span>
        ),
    },
  ]

  return (
    <div
      style={{
        marginTop: 16,
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          background: '#fafafa',
          fontWeight: 600,
          fontSize: 14,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        重复调用
      </div>
      {groups.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af' }}>
          无重复调用
        </div>
      ) : (
        <Collapse
          ghost
          defaultActiveKey={groups.map((g) => g.key)}
          items={groups.map((g) => ({
            key: g.key,
            label: (
              <Space wrap size={8}>
                <span style={{ color: '#ee9627', fontWeight: 600 }}>
                  {g.operation}
                </span>
                <Tag>
                  <Typography.Text
                    copyable={{
                      text: g.appId,
                      tooltips: ['复制 App ID', '已复制'],
                    }}
                  >
                    {appMap?.get(g.appId) || g.appId}
                  </Typography.Text>
                </Tag>
                <Tag color="blue">×{g.spans.length}</Tag>
                {g.errorCount > 0 && (
                  <Tag color="error">错误 {g.errorCount}</Tag>
                )}
                <span style={{ color: '#9ca3af', fontSize: 12 }}>
                  平均 {formatDuration(g.avgDuration)} · 最大{' '}
                  {formatDuration(g.maxDuration)}
                </span>
              </Space>
            ),
            children: (
              <Table<Span>
                size="small"
                rowKey="span_id"
                columns={spanColumns}
                dataSource={g.spans}
                pagination={false}
                locale={{ emptyText: '暂无数据' }}
              />
            ),
          }))}
        />
      )}
    </div>
  )
}
