import { useState } from 'react'
import { Button, Card, Form, Input, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/auth'

interface LoginFormValues {
  username: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setToken = useAuthStore((s) => s.setToken)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await login(values)
      setToken(res.access_token)
      const params = new URLSearchParams(location.search)
      const redirect = params.get('redirect')
      navigate(
        redirect && redirect.startsWith('/') ? redirect : '/traces',
        { replace: true },
      )
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '登录失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 380 }} title="Mallard 链路追踪">
        {errorMsg && (
          <Alert
            type="error"
            message={errorMsg}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form<LoginFormValues>
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
