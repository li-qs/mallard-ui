import { useMemo } from 'react'
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd'
import {
  SearchOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { logout as apiLogout, getUser } from '../api/auth'
import { useEffect, useState } from 'react'
import type { User } from '../types'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const clear = useAuthStore((s) => s.clear)
  const token = useAuthStore((s) => s.token)
  const [user, setUser] = useState<User | null>(null)
  const [siderCollapsed, setSiderCollapsed] = useState(false)
  const siderWidth = siderCollapsed ? 80 : 200

  useEffect(() => {
    if (!token) return
    getUser()
      .then(setUser)
      .catch(() => {
        /* 401 已由拦截器统一处理 */
      })
  }, [token])

  const selectedKeys = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/traces')) return ['traces']
    if (path.startsWith('/apps')) return ['apps']
    if (path.startsWith('/account')) return ['account']
    return ['traces']
  }, [location.pathname])

  const isTraceDetail = /^\/traces\/[^/]+$/.test(location.pathname)

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch {
      /* 后端登出失败也继续清理本地状态 */
    }
    clear()
    navigate('/login', { replace: true })
  }

  const menuItems = [
    { key: 'traces', icon: <SearchOutlined />, label: 'Trace 检索' },
    { key: 'apps', icon: <AppstoreOutlined />, label: 'App 管理' },
    { key: 'account', icon: <UserOutlined />, label: '个人中心' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        breakpoint="lg"
        collapsible
        collapsed={siderCollapsed}
        onCollapse={setSiderCollapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          Mallard
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => {
            if (key === 'traces') navigate('/traces')
            else if (key === 'apps') navigate('/apps')
            else if (key === 'account') navigate('/account')
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: siderWidth, height: '100vh' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            {isTraceDetail && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/traces')}
              >
                返回
              </Button>
            )}
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.username ?? '未登录'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
