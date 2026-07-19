import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loading, StatusBadge, ConfirmDialog } from '../../components'
import { listRegistrations, cancelRegistration, listVisits, listPrescriptions, listExamRequests } from '../../api'
import { REG_STATUS_MAP, VISIT_STATUS_MAP, RX_STATUS_MAP, EXAM_STATUS_MAP, formatDateTime, formatMoney, formatVisitSchedule } from '../../utils'
import { useAuth } from '../../store'
import { useIsPc } from '../../hooks'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageBack } from '../shared'
import '../shared/views.css'

export default function RegistrationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isPc = useIsPc()
  const { user } = useAuth()

  const [reg, setReg] = useState(null)
  const [visits, setVisits] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelState, setCancelState] = useState({ show: false, loading: false })

  useEffect(() => {
    if (!user?.userId) return
    ;(async () => {
      setLoading(true)
      try {
        const list = await listRegistrations({ userId: user.userId })
        const found = Array.isArray(list) ? list.find(r => String(r.id) === id) : null
        if (!found) { setError('挂号记录不存在'); return }
        setReg(found)

        // 加载关联就诊
        try {
          const vList = await listVisits({})
          setVisits(Array.isArray(vList) ? vList.filter(v => v.registrationId === found.id) : [])
        } catch { /* ignore */ }
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    })()
  }, [id, user?.userId])

  // 加载关联处方和检查
  useEffect(() => {
    if (visits.length === 0) return
    ;(async () => {
      for (const v of visits) {
        try {
          const rxList = await listPrescriptions({ visitId: v.id })
          if (Array.isArray(rxList)) setPrescriptions(prev => [...prev, ...rxList])
        } catch { /* ignore */ }
        try {
          const examList = await listExamRequests({ visitId: v.id })
          if (Array.isArray(examList)) setExams(prev => [...prev, ...examList])
        } catch { /* ignore */ }
      }
    })()
  }, [visits])

  const handleCancel = async () => {
    setCancelState(s => ({ ...s, loading: true }))
    try {
      await cancelRegistration(Number(id))
      navigate('/registration', { replace: true })
    } catch (e) {
      setError(e.message || '取消失败')
      setCancelState({ show: false, loading: false })
    }
  }

  const content = (
    <div className="page">
      <PageBack onClick={() => navigate('/registration')} label="返回挂号列表" />

      {error && <div className="card" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : !reg ? <div className="card" style={{ textAlign: 'center', color: 'var(--c-sub)' }}>挂号记录不存在</div> : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 挂号信息 */}
          <div className="card">
            <div className="flex-between mb-md">
              <h2 style={{ margin: 0 }}>挂号详情</h2>
              <StatusBadge status={reg.status} map={REG_STATUS_MAP} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailItem label="挂号编号" value={reg.regNo} />
              <DetailItem label="患者" value={user?.realName || user?.username} />
              <DetailItem label="科室" value={reg.deptName} />
              <DetailItem label="医生" value={reg.staffName} />
              <DetailItem label="就诊时间" value={formatVisitSchedule(reg.workDate, reg.timePeriod)} />
              <DetailItem label="挂号时间" value={formatDateTime(reg.regTime)} />
              <DetailItem label="挂号费" value={formatMoney(reg.regFee)} />
            </div>
            {reg.status === 1 && (
              <div style={{ marginTop: 16 }}>
                <button className="btn btn--danger btn--sm" onClick={() => setCancelState({ show: true, loading: false })}>
                  取消挂号
                </button>
              </div>
            )}
          </div>

          {/* 就诊记录 */}
          {visits.map((v) => (
            <div key={v.id} className="card">
              <div className="flex-between mb-md">
                <h3 style={{ margin: 0 }}>就诊记录</h3>
                <StatusBadge status={v.status} map={VISIT_STATUS_MAP} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                <DetailItem label="就诊编号" value={v.visitNo} />
                <DetailItem label="就诊时间" value={formatDateTime(v.visitTime)} />
                <DetailItem label="主诉" value={v.chiefComplaint || '—'} />
                <DetailItem label="诊断" value={v.diagnosis || '—'} />
              </div>

              {/* 处方 */}
              {prescriptions.filter(p => p.visitId === v.id).map((rx) => (
                <div key={rx.id} style={{ marginTop: 16, padding: 16, background: 'var(--c-bg)', borderRadius: 'var(--radius)' }}>
                  <div className="flex-between mb-sm">
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>处方 {rx.rxNo}</div>
                    <StatusBadge status={rx.status} map={RX_STATUS_MAP} />
                  </div>
                  <div style={{ fontWeight: 500 }}>总金额：{formatMoney(rx.totalAmount)}</div>
                  {rx.items?.map((item, i) => (
                    <div key={i} style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--c-border)' }}>
                      <div style={{ fontSize: '0.9rem' }}>药品 #{item.drugId} × {item.quantity}</div>
                      <div className="text-sub text-sm">单价 {formatMoney(item.unitPrice)} · 金额 {formatMoney(item.amount)}</div>
                      {item.usageDesc && <div className="text-sub text-sm">用法：{item.usageDesc}</div>}
                    </div>
                  )) || null}
                </div>
              ))}

              {/* 检查申请 */}
              {exams.filter(e => e.visitId === v.id).map((exam) => (
                <div key={exam.id} style={{ marginTop: 12, padding: 16, background: 'var(--c-bg)', borderRadius: 'var(--radius)' }}>
                  <div className="flex-between">
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>检查申请 {exam.requestNo}</div>
                    <StatusBadge status={exam.status} map={EXAM_STATUS_MAP} />
                  </div>
                  <div className="text-sub text-sm">费用：{formatMoney(exam.amount)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        show={cancelState.show}
        title="取消挂号"
        message={`确认取消挂号单 ${reg?.regNo}？`}
        loading={cancelState.loading}
        onConfirm={handleCancel}
        onCancel={() => setCancelState({ show: false })}
      />

      {!isPc && <MobileTabbar />}
    </div>
  )

  if (isPc) return <PcLayout>{content}</PcLayout>
  return content
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-muted text-sm">{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
