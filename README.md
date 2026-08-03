# Mallard-UI

[Mallard](https://github.com/li-qs/mallard) 链路追踪系统的 Web 控制台。业务应用通过 App 凭证上报 span，运营人员在控制台检索 Trace、查看链路瀑布图、管理上报 App。

## 功能

- **登录**：JWT + Refresh Token（HttpOnly Cookie），登录态自动续期，过期自动跳转登录并保留原始 URL
- **Trace 检索** `/traces`：按 trace_id 前缀、App、操作名、状态、时间范围筛选，分页展示
- **Trace 详情** `/traces/:traceId`：
  - 瀑布图：按 `parent_id` 组树，支持折叠/展开，错误 span 红色高亮，Hover 查看 span 详情
  - 重复调用分析：聚合相同 `app + 操作` 的 span，展示调用链与耗时统计
- **App 管理** `/apps`：新建（secret 仅展示一次）、编辑 IP 白名单、轮换 secret、删除（均需二次确认）；支持按 App 名称/ID 检索
- **个人中心** `/account`：查看当前用户、修改密码（改密后强制重新登录）

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| UI | Ant Design 5 |
| 路由 | react-router-dom v6 |
| HTTP | axios（统一拦截器：Bearer 注入、401 自动刷新重试、`body.code` 业务错误处理） |
| 状态 | zustand（persist 持久化 access_token） |
| 时间 | dayjs |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置后端地址（默认 http://localhost:9010）
cp .env.example .env

# 3. 启动
npm run dev
```

生产构建：

```bash
npm run build
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:9010` |

## 与后端联调

- 后端：https://github.com/li-qs/mallard
- 接口遵循统一响应格式 `{ code, message?, data }`，`code === 0` 表示成功；分页响应为 `{ page, page_size, total, list }`
- 认证：`Authorization: Bearer <access_token>`；`refresh_token` 存放在 HttpOnly Cookie，前端不可读、由拦截器自动续期
- 时间单位：`created_at` / `updated_at` / `reported_at` 为**毫秒**；`start_time` / `duration` 为**纳秒**
- 本地纯 HTTP 联调时，后端需配置 `cookie_secure: false`，否则 Refresh Token Cookie 不会被浏览器发送

## 目录结构

```
src/
├── api/               # 接口层（http.ts 拦截器 + auth/app/trace）
├── types/             # 全局 TS 类型（与后端契约对应）
├── components/        # ProtectedRoute、SpanTree（瀑布图）、DuplicateCalls
├── pages/             # Login、TraceList、TraceDetail、AppList、Account
├── layouts/           # MainLayout（固定侧栏 + 顶栏）
├── store/             # zustand 登录态
├── router/            # 路由表 + 受保护路由
└── utils/             # 时间/时长格式化
```

## License

[MIT](./LICENSE)
