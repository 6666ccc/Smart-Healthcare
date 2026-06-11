import { useMemo } from 'react'
import { useAuth } from '../../store'
import { getPortalLabel, getPortalType, PORTAL } from '../Home/role'

/**
 * 个人中心展示用用户信息（三端共用）
 */
export function useUserProfile() {
  const { user } = useAuth()

  return useMemo(() => {
    const displayName = user?.realName || user?.username || '用户'
    const displayInitial = displayName.charAt(0)
    const portal = getPortalType(user)
    const portalLabel = getPortalLabel(portal)

    const infoRows = [
      { label: '登录名', value: user?.username },
      { label: '角色', value: user?.roleName || '—' },
      { label: '门户', value: portalLabel },
      { label: '用户 ID', value: user?.userId != null ? String(user.userId) : '—' },
    ]

    if (portal === PORTAL.DOCTOR && user?.staffId != null) {
      infoRows.push({ label: '医护人员 ID', value: String(user.staffId) })
    }
    if (portal === PORTAL.PATIENT && user?.patientId != null) {
      infoRows.push({ label: '患者档案 ID', value: String(user.patientId) })
    }

    return {
      user,
      displayName,
      displayInitial,
      portal,
      portalLabel,
      infoRows,
    }
  }, [user])
}
