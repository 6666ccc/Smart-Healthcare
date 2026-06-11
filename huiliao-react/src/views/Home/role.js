/** 首页门户类型：管理端 | 医生端 | 患者端 */
export const PORTAL = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
}

/** 后端 LoginVO 推荐显式返回 portalType，取值与 PORTAL 一致 */
const PORTAL_VALUES = new Set(Object.values(PORTAL))

const DOCTOR_USERNAME_RE = /^doctor\d*$/i

function normalizePortal(value) {
  const v = String(value ?? '').toLowerCase()
  return PORTAL_VALUES.has(v) ? v : null
}

/**
 * 根据 LoginVO 判断首页门户（字段约定见 doc/API.md §认证）
 *
 * 1. portalType / userType — 后端 LoginAssembler 解析结果（主路径）
 * 2. roleCode / roleName / username — 仅在后端未返回门户时的本地兜底
 */
export function getPortalType(user) {
  if (!user) return PORTAL.PATIENT

  const explicit =
    normalizePortal(user.portalType) ??
    normalizePortal(user.userType) ??
    normalizePortal(user.portal)
  if (explicit) return explicit

  const roleCode = String(user.roleCode ?? user.role ?? '').toLowerCase()
  const roleName = String(user.roleName ?? '')
  const username = String(user.username ?? '').toLowerCase()

  if (roleCode === 'patient' || roleName.includes('患者') || username.startsWith('patient')) {
    return PORTAL.PATIENT
  }

  if (roleCode === 'doctor' || roleName.includes('医生') || DOCTOR_USERNAME_RE.test(username)) {
    return PORTAL.DOCTOR
  }

  return PORTAL.ADMIN
}

export function getPortalLabel(portal) {
  const labels = {
    [PORTAL.ADMIN]: '管理端',
    [PORTAL.DOCTOR]: '医生端',
    [PORTAL.PATIENT]: '患者端',
  }
  return labels[portal] ?? '首页'
}
