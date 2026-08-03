import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import type { TableProps } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { Link } from 'react-router-dom'
import { searchTraces } from '../api/trace'
import { listApps } from '../api/app'
import type { TraceSummary } from '../types'
import { formatDuration, msToTime, nsToMs } from '../utils/format'

const { RangePicker } = DatePicker

interface SearchFormValues {
  trace_id?: string
  app_id?: string
  operation?: string
  status?: string
  time_range?: [Dayjs, Dayjs]
}

const STATUS_OPTIONS = [
  { value: '0', label: '全部' },
  { value: '1', label: '成功' },
  { value: '2', label: '错误' },
]

export default function TraceList() {
  const [form] = Form.useForm<SearchFormValues>()
  const [list, setList] = useState<TraceSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
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

  const appOptions = useMemo(
    () =>
      Array.from(appMap, ([id, name]) => ({
        value: id,
        label: name,
      })),
    [appMap],
  )

  const fetchData = useCallback(
    async (p: number, ps: number, values: SearchFormValues) => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = {
          page: p,
          page_size: ps,
        }
        if (values.trace_id) params.trace_id = values.trace_id
        if (values.app_id) params.app_id = values.app_id
        if (values.operation) params.operation = values.operation
        if (values.status && values.status !== '0') {
          params.status = Number(values.status)
        }
        if (values.time_range && values.time_range.length === 2) {
          params.start_time_gt = values.time_range[0].valueOf() * 1e6
          params.start_time_lt = values.time_range[1].valueOf() * 1e6
        }
        const res = await searchTraces(params as never)
        setList(res.list)
        setTotal(res.total)
        setPage(res.page)
        setPageSize(res.page_size)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchData(1, pageSize, {})
  }, [fetchData, pageSize])

  const onSearch = () => {
    const values = form.getFieldsValue()
    setPage(1)
    fetchData(1, pageSize, values)
  }

  const onReset = () => {
    form.resetFields()
    setPage(1)
    fetchData(1, pageSize, {})
  }

  const onTableChange: TableProps<TraceSummary>['onChange'] = (pagination) => {
    const p = pagination.current ?? 1
    const ps = pagination.pageSize ?? 10
    setPage(p)
    setPageSize(ps)
    fetchData(p, ps, form.getFieldsValue())
  }

  const columns: TableProps<TraceSummary>['columns'] = [
    {
      title: 'Trace ID',
      dataIndex: 'trace_id',
      key: 'trace_id',
      width: 300,
      render: (id: string) => <Link to={`/traces/${id}`}>{id}</Link>,
    },
    {
      title: '操作',
      dataIndex: 'operation',
      key: 'operation',
      ellipsis: true,
    },
    {
      title: 'App',
      dataIndex: 'app_ids',
      key: 'app_ids',
      render: (ids: string[]) => (
        <Space size={4} wrap>
          {ids.map((id) => (
            <Tag key={id}>{appMap.get(id) || id}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (ns: number) => msToTime(nsToMs(ns)),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      render: (ns: number) => formatDuration(ns),
    },
    {
      title: 'Span 数',
      dataIndex: 'span_count',
      key: 'span_count',
      width: 90,
    },
    {
      title: '状态',
      dataIndex: 'has_error',
      key: 'has_error',
      width: 90,
      render: (hasError: boolean) =>
        hasError ? (
          <span style={{ color: '#ff4d4f' }}>错误</span>
        ) : (
          <span style={{ color: '#999' }}>正常</span>
        ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Form<SearchFormValues>
          form={form}
          layout="inline"
          style={{ rowGap: 12 }}
        >
          <Form.Item name="trace_id" label="Trace ID">
            <Input placeholder="Trace ID 前缀" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="app_id" label="App">
            <Select
              placeholder="按 App 名称筛选"
              style={{ width: 200 }}
              allowClear
              showSearch
              optionFilterProp="label"
              options={appOptions}
            />
          </Form.Item>
          <Form.Item name="operation" label="操作">
            <Input placeholder="操作名" style={{ width: 160 }} allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={STATUS_OPTIONS}
              style={{ width: 120 }}
              defaultValue="0"
            />
          </Form.Item>
          <Form.Item name="time_range" label="开始时间">
            <RangePicker showTime />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onSearch}>
                搜索
              </Button>
              <Button onClick={onReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        <Table<TraceSummary>
          rowKey="trace_id"
          loading={loading}
          columns={columns}
          dataSource={list}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          onChange={onTableChange}
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>
    </div>
  )
}
