import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { listPendingDispensePrescriptions } from '../../../api/modules/consultation'
import { dispensePrescription } from '../../../api/modules/payment'
import { getPortalType } from '../../Home/role'
import { formatDateTime } from '../../../utils'
import MobileTabbar from '../../Home/MobileTabbar'
import './index.css'

export default function DispenseMobile() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dispensing, setDispensing] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPendingDispensePrescriptions()
      setPrescriptions(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDispense = async (id) => {
    if (!window.confirm('确认发药？')) return
    setDispensing(id)
    try {
      await dispensePrescription(id)
      loadData()
    } catch (err) {
      alert(err.message || '发药失败')
    } finally { setDispensing(null) }
  }

  return (
    <div className="disp-page">
      <header className="disp-header"><h1>发药管理</h1></header>

      <main className="disp-main">
        {loading && <p className="disp-empty">加载中…</p>}
        {!loading && prescriptions.length === 0 && <p className="disp-empty">暂无待发药处方</p>}
        {prescriptions.map((p) => (
          <div key={p.id} className="disp-card">
            <div className="disp-card-body">
              <strong>{p.patientName || `处方 #${p.id}`}</strong>
              <span className="disp-drugs">{p.drugNames || p.items || '—'}</span>
              {p.createTime && <span className="disp-time">{formatDateTime(p.createTime)}</span>}
            </div>
            <button type="button" className="disp-dispense-btn"
              disabled={dispensing === p.id}
              onClick={() => handleDispense(p.id)}>
              {dispensing === p.id ? '发药中…' : '发药'}
            </button>
          </div>
        ))}
      </main>

      <MobileTabbar portal={portal} />
    </div>
  )
}
