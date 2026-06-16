/**
 * 慧疗 (HuiLiao) 路由配置
 *
 * ── 架构说明 ──
 * 1. 公开路由 (GuestOnly)  — 仅未登录可访问
 * 2. 认证路由 (RequireAuth) — 需登录，不做角色级拦截
 *    角色差异通过 Home/data.js 的导航配置（侧边栏/TabBar）控制可见菜单
 * 3. 所有页面组件使用 React.lazy 懒加载，减少首屏体积
 *
 * ── 门户访问矩阵（导航层面）──
 * Admin:   home / registration / consultation / payment / dispense / patients / schedules / drugs / department
 * Doctor:  home / consultation / registration
 * Patient: home / registration / department / payment / user
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './guards'

// ============================================================================
//  懒加载页面组件
// ============================================================================
const Login              = lazy(() => import('../views/Login'))
const Home               = lazy(() => import('../views/Home'))
const User               = lazy(() => import('../views/User'))
const Assistant          = lazy(() => import('../views/Assistant'))
const Registration       = lazy(() => import('../views/Registration'))
const RegistrationDetail = lazy(() => import('../views/Registration/Detail'))
const Department         = lazy(() => import('../views/Department'))
const Payment            = lazy(() => import('../views/Payment'))
const PaymentPay         = lazy(() => import('../views/Payment/Pay'))
const Consultation       = lazy(() => import('../views/Consultation'))
const Dispense           = lazy(() => import('../views/Dispense'))
const PatientList        = lazy(() => import('../views/PatientList'))
const ScheduleManage     = lazy(() => import('../views/ScheduleManage'))
const DrugManage         = lazy(() => import('../views/DrugManage'))

// ============================================================================
//  Suspense 包裹器
// ============================================================================
function PageFallback() {
  return (
    <div className="shared-loading">
      <div className="shared-loading-spinner" />
      <p>加载中…</p>
    </div>
  )
}

/** 为 React.lazy 组件包裹 Suspense 边界 */
function Lazy({ component: Page }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  )
}

// ============================================================================
//  路由表
// ============================================================================
const router = createBrowserRouter([
  // ──────────────────────────────────────────────────────────────────────
  //  公开路由（未登录）
  // ──────────────────────────────────────────────────────────────────────
  {
    element: <GuestOnly />,
    children: [
      { index: true, element: <Lazy component={Login} /> },
      { path: 'login', element: <Lazy component={Login} /> },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────
  //  认证路由（已登录）
  // ──────────────────────────────────────────────────────────────────────
  {
    element: <RequireAuth />,
    children: [
      // 首页 — 门户分流 + 仪表盘        [Admin / Doctor / Patient]
      { path: 'home', element: <Lazy component={Home} /> },

      // 个人中心                          [Admin / Doctor / Patient]
      { path: 'user', element: <Lazy component={User} /> },

      // AI 助手                           [Admin / Doctor / Patient]
      { path: 'assistant', element: <Lazy component={Assistant} /> },

      // 挂号管理                          [Admin / Doctor / Patient]
      {
        path: 'registration',
        children: [
          { index: true, element: <Lazy component={Registration} /> },
          { path: ':id', element: <Lazy component={RegistrationDetail} /> },
        ],
      },

      // 收费管理                          [Admin / Patient]
      {
        path: 'payment',
        children: [
          { index: true, element: <Lazy component={Payment} /> },
          { path: ':id', element: <Lazy component={PaymentPay} /> },
        ],
      },

      // 接诊管理                          [Admin / Doctor]
      { path: 'consultation', element: <Lazy component={Consultation} /> },

      // 发药管理                          [Admin]
      { path: 'dispense', element: <Lazy component={Dispense} /> },

      // 患者管理                          [Admin]
      { path: 'patients', element: <Lazy component={PatientList} /> },

      // 排班管理                          [Admin]
      { path: 'schedules', element: <Lazy component={ScheduleManage} /> },

      // 药品管理                          [Admin]
      { path: 'drugs', element: <Lazy component={DrugManage} /> },

      // 科室查询                          [Admin / Patient]
      { path: 'department', element: <Lazy component={Department} /> },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────
  //  兜底重定向
  // ──────────────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
