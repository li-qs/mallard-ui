import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import Login from '../pages/Login'
import TraceList from '../pages/TraceList'
import TraceDetail from '../pages/TraceDetail'
import AppList from '../pages/AppList'
import Account from '../pages/Account'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/traces', element: <TraceList /> },
          { path: '/traces/:traceId', element: <TraceDetail /> },
          { path: '/apps', element: <AppList /> },
          { path: '/account', element: <Account /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/traces" replace /> },
])
