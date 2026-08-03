import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import type { TableProps } from 'antd/es/table'
import {
  addApp,
  deleteApp,
  listApps,
  rotateSecret,
  updateIpAllowList,
} from '../api/app'
import type { App } from '../types'
import { msToTime } from '../utils/format'

function parseIpList(text: string): string[] {
  return text
    .split(/[\n,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

interface CreateFormValues {
  app_name: string
  ip_allow_list?: string
}

interface EditFormValues {
  ip_allow_list?: string
}

interface SearchFormValues {
  app_name?: string
  id?: string
}

interface SecretResult {
  title: string
  appId: string
  appName: string
  secret: string
}

export default function AppList() {
  const [list, setList] = useState<App[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm] = Form.useForm<CreateFormValues>()

  const [editOpen, setEditOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)
  const [editForm] = Form.useForm<EditFormValues>()

  const [secretResult, setSecretResult] = useState<SecretResult | null>(null)
  const [searchForm] = Form.useForm<SearchFormValues>()
  const [deleteTarget, setDeleteTarget] = useState<App | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [rotateTarget, setRotateTarget] = useState<App | null>(null)
  const [rotateConfirmName, setRotateConfirmName] = useState('')
  const [rotateSubmitting, setRotateSubmitting] = useState(false)

  const fetchData = useCallback(
    async (p: number, ps: number, filters?: { app_name?: string; id?: string }) => {
      setLoading(true)
      try {
        const res = await listApps(p, ps, filters)
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
    fetchData(1, 10)
  }, [fetchData])

  const refreshList = () =>
    fetchData(page, pageSize, searchForm.getFieldsValue())

  const onSearch = () => {
    const filters = searchForm.getFieldsValue()
    fetchData(1, pageSize, filters)
  }

  const onReset = () => {
    searchForm.resetFields()
    fetchData(1, pageSize, {})
  }

  const handleCreate = async () => {
    const values = await createForm.validateFields()
    setCreateSubmitting(true)
    try {
      const res = await addApp({
        app_name: values.app_name,
        ip_allow_list: parseIpList(values.ip_allow_list || ''),
      })
      setCreateOpen(false)
      createForm.resetFields()
      setSecretResult({
        title: '新建 App 成功',
        appId: res.id,
        appName: res.app_name,
        secret: res.secret,
      })
    } catch {
      /* 拦截器已提示 */
    } finally {
      setCreateSubmitting(false)
    }
  }

  const openEdit = (app: App) => {
    setEditingApp(app)
    editForm.setFieldsValue({ ip_allow_list: app.ip_allow_list.join('\n') })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    const values = await editForm.validateFields()
    if (!editingApp) return
    setEditSubmitting(true)
    try {
      await updateIpAllowList(editingApp.id, parseIpList(values.ip_allow_list || ''))
      message.success('allow list 已更新')
      setEditOpen(false)
      refreshList()
    } catch {
      /* 拦截器已提示 */
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleRotate = (app: App) => {
    setRotateTarget(app)
    setRotateConfirmName('')
  }

  const confirmRotate = async () => {
    if (!rotateTarget) return
    setRotateSubmitting(true)
    try {
      const res = await rotateSecret(rotateTarget.id)
      setRotateTarget(null)
      setRotateConfirmName('')
      setSecretResult({
        title: '更新 Secret 成功',
        appId: rotateTarget.id,
        appName: rotateTarget.app_name,
        secret: res.secret,
      })
    } catch {
      /* 拦截器已提示 */
    } finally {
      setRotateSubmitting(false)
    }
  }

  const handleDelete = (app: App) => {
    setDeleteTarget(app)
    setDeleteConfirmName('')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    try {
      await deleteApp(deleteTarget.id)
      message.success('已删除')
      const rest = total - 1
      const targetPage = list.length === 1 && page > 1 ? page - 1 : page
      if (rest > 0) setPage(targetPage)
      setDeleteTarget(null)
      setDeleteConfirmName('')
      fetchData(targetPage, pageSize, searchForm.getFieldsValue())
    } catch {
      /* 拦截器已提示 */
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const onTableChange: TableProps<App>['onChange'] = (pagination) => {
    const p = pagination.current ?? 1
    const ps = pagination.pageSize ?? 10
    setPage(p)
    setPageSize(ps)
    fetchData(p, ps, searchForm.getFieldsValue())
  }

  const columns: TableProps<App>['columns'] = [
    { title: 'App 名称', dataIndex: 'app_name', key: 'app_name' },
    {
      title: 'App ID',
      dataIndex: 'id',
      key: 'id',
      width: 260,
      render: (id: string) => (
        <Typography.Text copyable={{ text: id }}>{id}</Typography.Text>
      ),
    },
    {
      title: 'IP 白名单',
      dataIndex: 'ip_allow_list',
      key: 'ip_allow_list',
      render: (ips: string[]) =>
        ips.length === 0 ? (
          <Tag>不限</Tag>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ips.map((ip) => (
              <span key={ip} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {ip}
              </span>
            ))}
          </div>
        ),
    },
    {
      title: '创建于',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (ms: number) => msToTime(ms),
    },
    {
      title: '更新于',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (ms: number) => msToTime(ms),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_, app) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(app)}>
            IP 白名单
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleRotate(app)}
          >
            更新 Secret
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(app)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="App 管理"
        extra={
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建 App
          </Button>
        }
      >
        <Form<SearchFormValues>
          form={searchForm}
          layout="inline"
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="app_name" label="App 名称">
            <Input placeholder="按名称模糊查询" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="id" label="App ID">
            <Input placeholder="按 ID 精确查询" style={{ width: 240 }} allowClear />
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
        <Table<App>
          rowKey="id"
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

      <Modal
        title="新建 App"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createSubmitting}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<CreateFormValues> form={createForm} layout="vertical">
          <Form.Item
            name="app_name"
            label="App 名称"
            rules={[{ required: true, message: '请输入 App 名称' }]}
          >
            <Input placeholder="如 my-service" />
          </Form.Item>
          <Form.Item
            name="ip_allow_list"
            label="IP 允许列表（可选，一行一条 IP 或 CIDR）"
            extra="留空表示不限制来源 IP；示例：192.168.1.10、10.0.0.0/24"
          >
            <Input.TextArea
              rows={4}
              placeholder={'192.168.1.10\n10.0.0.0/24'}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑 IP 白名单"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
        confirmLoading={editSubmitting}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form<EditFormValues> form={editForm} layout="vertical">
          <Form.Item
            name="ip_allow_list"
            label="IP 允许列表（一行一条 IP 或 CIDR）"
            extra="留空表示不限制来源 IP"
          >
            <Input.TextArea rows={6} placeholder={'192.168.1.10\n10.0.0.0/24'} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={secretResult?.title}
        open={!!secretResult}
        onCancel={() => {
          setSecretResult(null)
          refreshList()
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setSecretResult(null)
              refreshList()
            }}
          >
            我已保存，关闭
          </Button>
        }
      >
        {secretResult && (
          <div>
            <Alert
              type="warning"
              showIcon
              message="请立即保存 secret，关闭后将无法再次查看"
              style={{ marginBottom: 16 }}
            />
            <Typography.Paragraph>
              <Typography.Text type="secondary">App 名称</Typography.Text>
              <br />
              <Typography.Text strong>{secretResult.appName}</Typography.Text>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <Typography.Text type="secondary">App ID</Typography.Text>
              <br />
              <Typography.Text copyable={{ text: secretResult.appId }}>
                {secretResult.appId}
              </Typography.Text>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <Typography.Text type="secondary">Secret</Typography.Text>
              <br />
              <Typography.Text code copyable={{ text: secretResult.secret }}>
                {secretResult.secret}
              </Typography.Text>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <Typography.Text type="secondary">Basic 认证示例</Typography.Text>
              <br />
              <Typography.Text code style={{ wordBreak: 'break-all' }}>
                Authorization: Basic{' '}
                {btoa(`${secretResult.appId}:${secretResult.secret}`)}
              </Typography.Text>
            </Typography.Paragraph>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <span>
            <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
            删除 App
          </span>
        }
        open={!!deleteTarget}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteConfirmName('')
        }}
        onOk={confirmDelete}
        okButtonProps={{
          danger: true,
          disabled: deleteConfirmName !== deleteTarget?.app_name,
        }}
        confirmLoading={deleteSubmitting}
        okText="删除"
        cancelText="取消"
        destroyOnHidden
      >
        <p style={{ marginBottom: 16 }}>
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
            删除后不可恢复。
          </span>
          请输入 App 名称{' '}
          <Typography.Text strong>{deleteTarget?.app_name}</Typography.Text>{' '}
          以确认删除：
        </p>
        <Input
          value={deleteConfirmName}
          onChange={(e) => setDeleteConfirmName(e.target.value)}
          onPressEnter={() => {
            if (deleteConfirmName === deleteTarget?.app_name) {
              confirmDelete()
            }
          }}
        />
      </Modal>

      <Modal
        title={
          <span>
            <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
            更新 Secret
          </span>
        }
        open={!!rotateTarget}
        onCancel={() => {
          setRotateTarget(null)
          setRotateConfirmName('')
        }}
        onOk={confirmRotate}
        okButtonProps={{
          danger: true,
          disabled: rotateConfirmName !== rotateTarget?.app_name,
        }}
        confirmLoading={rotateSubmitting}
        okText="更新"
        cancelText="取消"
        destroyOnHidden
      >
        <p style={{ marginBottom: 16 }}>
          <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
            更新后旧 Secret 将立即失效。
          </span>
          请输入 App 名称{' '}
          <Typography.Text strong>{rotateTarget?.app_name}</Typography.Text>{' '}
          以确认更新：
        </p>
        <Input
          value={rotateConfirmName}
          onChange={(e) => setRotateConfirmName(e.target.value)}
          onPressEnter={() => {
            if (rotateConfirmName === rotateTarget?.app_name) {
              confirmRotate()
            }
          }}
        />
      </Modal>
    </div>
  )
}
