import { PORTAL } from './role'

export const ANNOUNCEMENTS = [
  { id: 1, title: '关于国庆期间门诊安排的通知', date: '2025-09-25' },
  { id: 2, title: '新院区智慧导诊系统上线公告', date: '2025-09-18' },
  { id: 3, title: '在线问诊服务时间调整说明', date: '2025-09-10' },
]

export const PORTAL_SUBTITLE = {
  [PORTAL.ADMIN]: '以下是今日运营概览',
  [PORTAL.DOCTOR]: '以下是您的门诊工作台',
  [PORTAL.PATIENT]: '以下是您的就诊服务',
}

export const MOBILE_TABS_BY_PORTAL = {
  [PORTAL.ADMIN]: [
    { path: '/home', label: '首页', icon: 'home' },
    { path: '/registration', label: '挂号', icon: 'calendar' },
    { path: '/consultation', label: '接诊', icon: 'chat' },
    { path: '/payment', label: '收费', icon: 'wallet' },
    { path: '/user', label: '我的', icon: 'user' },
  ],
  [PORTAL.DOCTOR]: [
    { path: '/home', label: '首页', icon: 'home' },
    { path: '/consultation', label: '待诊', icon: 'chat' },
    { path: '/registration', label: '排班', icon: 'calendar' },
    { path: '/user', label: '我的', icon: 'user' },
  ],
  [PORTAL.PATIENT]: [
    { path: '/home', label: '首页', icon: 'home' },
    { path: '/registration', label: '挂号', icon: 'calendar' },
    { path: '/department', label: '科室', icon: 'building' },
    { path: '/payment', label: '缴费', icon: 'wallet' },
    { path: '/user', label: '我的', icon: 'user' },
  ],
}

export const SIDEBAR_NAV_BY_PORTAL = {
  [PORTAL.ADMIN]: [
    { id: 'home', label: '首页', path: '/home', icon: 'home' },
    { id: 'registration', label: '挂号管理', path: '/registration', icon: 'calendar' },
    { id: 'consultation', label: '接诊管理', path: '/consultation', icon: 'chat' },
    { id: 'payment', label: '收费管理', path: '/payment', icon: 'wallet' },
    { id: 'dispense', label: '发药管理', path: '/dispense', icon: 'dispense' },
    { id: 'patients', label: '患者管理', path: '/patients', icon: 'folder' },
    { id: 'schedules', label: '排班管理', path: '/schedules', icon: 'calendar' },
    { id: 'drugs', label: '药品管理', path: '/drugs', icon: 'report' },
    { id: 'department', label: '科室查询', path: '/department', icon: 'building' },
  ],
  [PORTAL.DOCTOR]: [
    { id: 'home', label: '工作台', path: '/home', icon: 'home' },
    { id: 'consultation', label: '接诊管理', path: '/consultation', icon: 'chat' },
    { id: 'registration', label: '排班查看', path: '/registration', icon: 'calendar' },
    { id: 'report', label: '检查报告', path: '/consultation', icon: 'report' },
  ],
  [PORTAL.PATIENT]: [
    { id: 'home', label: '首页', path: '/home', icon: 'home' },
    { id: 'registration', label: '预约挂号', path: '/registration', icon: 'calendar' },
    { id: 'department', label: '科室查询', path: '/department', icon: 'building' },
    { id: 'payment', label: '门诊缴费', path: '/payment', icon: 'wallet' },
    { id: 'health', label: '健康档案', path: '/user', icon: 'folder' },
  ],
}

export const SIDEBAR_BOTTOM_BY_PORTAL = {
  [PORTAL.ADMIN]: [
    { id: 'message', label: '消息中心', path: '/user', icon: 'message' },
    { id: 'settings', label: '设置中心', path: '/user', icon: 'settings' },
  ],
  [PORTAL.DOCTOR]: [
    { id: 'message', label: '消息中心', path: '/user', icon: 'message' },
    { id: 'settings', label: '设置中心', path: '/user', icon: 'settings' },
  ],
  [PORTAL.PATIENT]: [
    { id: 'message', label: '消息中心', path: '/user', icon: 'message' },
    { id: 'settings', label: '设置中心', path: '/user', icon: 'settings' },
  ],
}

export const QUICK_ACTIONS_BY_PORTAL = {
  [PORTAL.ADMIN]: [
    { id: 'registration', title: '挂号', desc: '患者挂号', path: '/registration', icon: 'calendar-plus' },
    { id: 'consultation', title: '接诊', desc: '医生接诊', path: '/consultation', icon: 'stethoscope' },
    { id: 'payment', title: '收费', desc: '门诊收费', path: '/payment', icon: 'wallet' },
    { id: 'dispense', title: '发药', desc: '处方发药', path: '/dispense', icon: 'building' },
  ],
  [PORTAL.DOCTOR]: [
    { id: 'consultation', title: '开始接诊', desc: '待诊患者列表', path: '/consultation', icon: 'stethoscope' },
    { id: 'registration', title: '排班查看', desc: '今日排班', path: '/registration', icon: 'calendar-plus' },
    { id: 'report', title: '检查报告', desc: '查看检验结果', path: '/consultation', icon: 'report' },
  ],
  [PORTAL.PATIENT]: [
    { id: 'registration', title: '预约挂号', desc: '在线选号', path: '/registration', icon: 'calendar-plus' },
    { id: 'department', title: '科室查询', desc: '找科室医生', path: '/department', icon: 'building' },
    { id: 'payment', title: '门诊缴费', desc: '待缴费用', path: '/payment', icon: 'wallet' },
    { id: 'health', title: '健康档案', desc: '就诊记录', path: '/user', icon: 'folder' },
  ],
}

/** @deprecated 使用 MOBILE_TABS_BY_PORTAL */
export const MOBILE_TABS = MOBILE_TABS_BY_PORTAL[PORTAL.ADMIN]

/** @deprecated 使用 SIDEBAR_NAV_BY_PORTAL */
export const SIDEBAR_NAV = SIDEBAR_NAV_BY_PORTAL[PORTAL.ADMIN]

/** @deprecated 使用 SIDEBAR_BOTTOM_BY_PORTAL */
export const SIDEBAR_BOTTOM = SIDEBAR_BOTTOM_BY_PORTAL[PORTAL.ADMIN]

/** @deprecated 使用 QUICK_ACTIONS_BY_PORTAL */
export const QUICK_ACTIONS = QUICK_ACTIONS_BY_PORTAL[PORTAL.ADMIN]
