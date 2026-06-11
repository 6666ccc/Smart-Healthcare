import { useCallback, useEffect, useState } from 'react'
import { getDashboard } from '../../api/modules/dashboard'
import { listPendingRegistrations, listRegistrations } from '../../api/modules/registration'
import { listPendingCharges, listCharges } from '../../api/modules/payment'
import { listPendingDispensePrescriptions, listVisits } from '../../api/modules/consultation'
import { listDrugStocks } from '../../api/modules/drugStock'
import { PORTAL } from './role'

/** 患者档案 ID（LoginVO.patientId），勿与 userId 混用 */
function resolvePatientId(user) {
  const id = user?.patientId
  return id != null && id !== '' ? Number(id) : null
}

function resolveStaffId(user) {
  const id = user?.staffId
  return id != null && id !== '' ? Number(id) : null
}

/**
 * 按门户类型加载首页数据（管理端 / 医生端 / 患者端）
 */
export function useHomeData(portal, user) {
  const [dashboard, setDashboard] = useState(null)
  const [pendingRegs, setPendingRegs] = useState([])
  const [pendingCharges, setPendingCharges] = useState([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [myRegistrations, setMyRegistrations] = useState([])
  const [myCharges, setMyCharges] = useState([])
  const [myVisits, setMyVisits] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (portal === PORTAL.ADMIN) {
        const [dash, regs, charges, prescriptions, stocks] = await Promise.allSettled([
          getDashboard(),
          listPendingRegistrations(),
          listPendingCharges(),
          listPendingDispensePrescriptions(),
          listDrugStocks({ lowStockOnly: true }),
        ])
        if (dash.status === 'fulfilled') setDashboard(dash.value)
        if (regs.status === 'fulfilled') setPendingRegs(Array.isArray(regs.value) ? regs.value : [])
        if (charges.status === 'fulfilled') setPendingCharges(Array.isArray(charges.value) ? charges.value : [])
        if (prescriptions.status === 'fulfilled') {
          setPendingPrescriptions(Array.isArray(prescriptions.value) ? prescriptions.value : [])
        }
        if (stocks.status === 'fulfilled') setLowStock(Array.isArray(stocks.value) ? stocks.value : [])
        return
      }

      if (portal === PORTAL.DOCTOR) {
        const staffId = resolveStaffId(user)
        const [dash, regs, visits] = await Promise.allSettled([
          getDashboard(),
          listPendingRegistrations(),
          listVisits(staffId != null ? { staffId, status: 1 } : { status: 1 }),
        ])
        if (dash.status === 'fulfilled') setDashboard(dash.value)
        if (regs.status === 'fulfilled') setPendingRegs(Array.isArray(regs.value) ? regs.value : [])
        if (visits.status === 'fulfilled') setMyVisits(Array.isArray(visits.value) ? visits.value : [])
        return
      }

      const patientId = resolvePatientId(user)
      const regParams = patientId ? { patientId } : {}
      const chargeParams = patientId ? { patientId, payStatus: 0 } : { payStatus: 0 }

      const [regs, charges] = await Promise.allSettled([
        listRegistrations(regParams),
        listCharges(chargeParams),
      ])
      if (regs.status === 'fulfilled') setMyRegistrations(Array.isArray(regs.value) ? regs.value : [])
      if (charges.status === 'fulfilled') setMyCharges(Array.isArray(charges.value) ? charges.value : [])
    } finally {
      setLoading(false)
    }
  }, [portal, user?.patientId, user?.staffId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const adminPendingCount =
    (dashboard?.pendingRegistrations ?? pendingRegs.length) +
    (dashboard?.pendingCharges ?? pendingCharges.length) +
    (dashboard?.pendingPrescriptions ?? pendingPrescriptions.length)

  const doctorPendingCount = pendingRegs.length + myVisits.length

  const patientPendingRegs = myRegistrations.filter((r) => r.status === 0 || r.status === 1)
  const patientPendingCount = patientPendingRegs.length + myCharges.length

  return {
    loading,
    dashboard,
    pendingRegs,
    pendingCharges,
    pendingPrescriptions,
    lowStock,
    myRegistrations,
    myCharges,
    myVisits,
    patientPendingRegs,
    pendingCount:
      portal === PORTAL.ADMIN
        ? adminPendingCount
        : portal === PORTAL.DOCTOR
          ? doctorPendingCount
          : patientPendingCount,
    reload: loadData,
  }
}
