import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { listRegistrations, cancelRegistration } from '../../api/modules/registration'
import { REG_STATUS_MAP, formatDateTime } from '../../utils'

export default function RegistrationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 后端暂无 GET /api/registrations/{id}，从列表中匹配
      const data = await listRegistrations()
      const list = Array.isArray(data) ? data : []
      setRecord(list.find((r) => String(r.id) === String(id)) || null)
    } catch { setRecord(null) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleCancel = async () => {
    if (!window.confirm('确认取消此挂号？')) return
    setCancelling(true)
    try {
      await cancelRegistration(id)
      load()
    } catch (err) {
      alert(err.message || '取消失败')
    } finally { setCancelling(false) }
  }

  if (loading) return <p className="shared-empty">加载中…</p>
  if (!record) return <p className="shared-empty">挂号记录不存在</p>

  const statusInfo = REG_STATUS_MAP[record.status] ?? { label: '未知', cls: '' }

  return (
    <div className="reg-detail">
      <button type="button" className="reg-detail-back" onClick={() => navigate(-1)}>← 返回</button>
      <h1>挂号详情</h1>

      <div className="reg-detail-card">
        <div className="reg-detail-row">
          <span className="reg-detail-label">挂号编号</span>
          <span>#{record.id}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">患者</span>
          <span>{record.patientName || `患者 #${record.patientId}`}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">科室</span>
          <span>{record.deptName || '—'}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">医生</span>
          <span>{record.doctorName || '—'}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">排班日期</span>
          <span>{record.scheduleDate || '—'}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">状态</span>
          <span className={`shared-status shared-status--${statusInfo.cls}`}>{statusInfo.label}</span>
        </div>
        <div className="reg-detail-row">
          <span className="reg-detail-label">创建时间</span>
          <span>{formatDateTime(record.createTime)}</span>
        </div>
        {record.cancelTime && (
          <div className="reg-detail-row">
            <span className="reg-detail-label">取消时间</span>
            <span>{formatDateTime(record.cancelTime)}</span>
          </div>
        )}
      </div>

      {record.status === 0 && (
        <div className="reg-detail-actions">
          <button type="button" className="shared-btn-cancel" disabled={cancelling} onClick={handleCancel}>
            {cancelling ? '取消中…' : '取消挂号'}
          </button>
        </div>
      )}
    </div>
  )
}
