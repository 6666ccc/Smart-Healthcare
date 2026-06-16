import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { Skeleton } from '../../../components'
import { listPendingDispensePrescriptions } from '../../../api/modules/consultation'
import { dispensePrescription } from '../../../api/modules/payment'
import { getPortalType } from '../../Home/role'
import { PcLayout } from '../../../layouts'
import { formatDateTime } from '../../../utils'
import './index.css'

export default function DispensePc() {
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
    <PcLayout portal={portal} searchPlaceholder="搜索处方…">
      <h1 className="disp-pc-title">发药管理</h1>

      {loading && <Skeleton variant="card" count={4} />}
      {!loading && prescriptions.length === 0 && <p className="disp-pc-empty">暂无待发药处方</p>}

      <div className="disp-pc-list">
        {prescriptions.map((p) => (
          <div key={p.id} className="disp-pc-card">
            <div className="disp-pc-card-body">
              <strong>{p.patientName || `处方 #${p.id}`}</strong>
              <span className="disp-pc-drugs">{p.drugNames || p.items || '—'}</span>
              {p.createTime && <span className="disp-pc-time">{formatDateTime(p.createTime)}</span>}
            </div>
            <div className="disp-pc-card-right">
              <span className="disp-pc-status">待发药</span>
              <button type="button" className="disp-pc-dispense-btn"
                disabled={dispensing === p.id}
                onClick={() => handleDispense(p.id)}>
                {dispensing === p.id ? '发药中…' : '确认发药'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </PcLayout>
  )
}
