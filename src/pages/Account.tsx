import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Form, Input, message, Skeleton } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getUser, updatePassword } from '../api/auth'
import { useAuthStore } from '../store/auth'
import type { User } from '../types'
import { msToTime } from '../utils/format'

interface PasswordFormValues {
  password: string
  new_password: string
  confirm: string
}

export default function Account() {
  const navigate = useNavigate()
  const clear = useAuthStore((s) => s.clear)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<PasswordFormValues>()

  useEffect(() => {
    getUser()
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const onFinish = async (values: PasswordFormValues) => {
    setSubmitting(true)
    try {
      await updatePassword({
        password: values.password,
        new_password: values.new_password,
      })
      message.success('密码已修改，请重新登录')
      clear()
      navigate('/login', { replace: true })
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Card title="当前用户" style={{ marginBottom: 24 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : user ? (
          <Descriptions
            column={1}
            items={[
              { key: 'id', label: 'id', children: user.id },
              { key: 'username', label: '用户名', children: user.username },
              {
                key: 'created_at',
                label: '创建时间',
                children: msToTime(user.created_at),
              },
            ]}
          />
        ) : null}
      </Card>

      <Card title="修改密码">
        <Form<PasswordFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ maxWidth: 420 }}
        >
          <Form.Item
            name="password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="新密码" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
