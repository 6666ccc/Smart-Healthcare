/** 按 portalType 返回默认首页路径 */
export function homePath(portalType) {
  if (portalType === 'doctor') return '/doctor/home'
  if (portalType === 'admin') return '/admin/home'
  return '/assistant'
}

export function isDoctorPortal(user) {
  return user?.portalType === 'doctor'
}

export function isPatientPortal(user) {
  return !user?.portalType || user.portalType === 'patient'
}
