import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { Skeleton } from '../../../components'
import { listPendingRegistrations } from '../../../api/modules/registration'
import { listVisits, startVisit, updateVisit } from '../../../api/modules/consultation'
import { listExamRequests, createExamRequest } from '../../../api/modules/consultation'
import { listPrescriptions, createPrescription, cancelPrescription } from '../../../api/modules/consultation'
import { listMedicalItems } from '../../../api/modules/medicalItem'
import { listDrugs } from '../../../api/modules/drug'
import { getPortalType } from '../../Home/role'
import { PcLayout } from '../../../layouts'
import './index.css'

const VISIT_STATUS_MAP = {
  0: { label: '待接诊', cls: '' },
  1: { label: '接诊中', cls: 'con-status--active' },
  2: { label: '已完成', cls: 'con-status--done' },
}

export default function ConsultationPc() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [pendingRegs, setPendingRegs] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)

  // Current active visit
  const [activeVisit, setActiveVisit] = useState(null)
  const [visitForm, setVisitForm] = useState({ chiefComplaint: '', diagnosis: '' })

  // Exam requests
  const [exams, setExams] = useState([])
  const [medicalItems, setMedicalItems] = useState([])
  const [examForm, setExamForm] = useState({ itemId: '' })

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState([])
  const [drugs, setDrugs] = useState([])
  const [rxForm, setRxForm] = useState({ drugId: '', quantity: 1, usageDesc: '' })

  const [tab, setTab] = useState('pending') // pending | visits
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadPending = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPendingRegistrations()
      setPendingRegs(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const loadVisits = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listVisits()
      setVisits(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const loadResources = useCallback(async () => {
    const [items, drugList] = await Promise.allSettled([listMedicalItems(), listDrugs()])
    if (items.status === 'fulfilled') setMedicalItems(Array.isArray(items.value) ? items.value : [])
    if (drugList.status === 'fulfilled') setDrugs(Array.isArray(drugList.value) ? drugList.value : [])
  }, [])

  useEffect(() => {
    if (tab === 'pending') loadPending()
    else loadVisits()
    loadResources()
  }, [tab, loadPending, loadVisits, loadResources])

  // Load visit details when selecting a visit
  const loadVisitDetail = useCallback(async (visit) => {
    setActiveVisit(visit)
    setVisitForm({
      chiefComplaint: visit.chiefComplaint || '',
      diagnosis: visit.diagnosis || '',
    })
    try {
      const [examData, rxData] = await Promise.allSettled([
        listExamRequests({ visitId: visit.id }),
        listPrescriptions({ visitId: visit.id }),
      ])
      if (examData.status === 'fulfilled') setExams(Array.isArray(examData.value) ? examData.value : [])
      if (rxData.status === 'fulfilled') setPrescriptions(Array.isArray(rxData.value) ? rxData.value : [])
    } catch { /* ignore */ }
  }, [])

  const handleStartVisit = async (registrationId) => {
    setError('')
    setSubmitting(true)
    try {
      const data = await startVisit(registrationId)
      const visitId = data?.visitId || data?.id
      if (visitId) {
        // Create a minimal visit object for the UI
        const newVisit = {
          id: visitId,
          registrationId,
          status: 1,
          chiefComplaint: '',
          diagnosis: '',
        }
        setActiveVisit(newVisit)
        setVisitForm({ chiefComplaint: '', diagnosis: '' })
        setExams([])
        setPrescriptions([])
        setTab('visits')
        loadVisits()
      }
      loadPending()
    } catch (err) {
      setError(err.message || '开始接诊失败')
    } finally { setSubmitting(false) }
  }

  const handleSaveVisit = async () => {
    if (!activeVisit) return
    setError('')
    setSubmitting(true)
    try {
      await updateVisit(activeVisit.id, {
        chiefComplaint: visitForm.chiefComplaint,
        diagnosis: visitForm.diagnosis,
        complete: true,
      })
      setActiveVisit(null)
      loadVisits()
    } catch (err) {
      setError(err.message || '保存失败')
    } finally { setSubmitting(false) }
  }

  const handleAddExam = async () => {
    if (!activeVisit || !examForm.itemId) return
    setSubmitting(true)
    try {
      await createExamRequest({
        visitId: activeVisit.id,
        itemId: Number(examForm.itemId),
      })
      setExamForm({ itemId: '' })
      const data = await listExamRequests({ visitId: activeVisit.id })
      setExams(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || '开立检查失败')
    } finally { setSubmitting(false) }
  }

  const handleAddRx = async () => {
    if (!activeVisit || !rxForm.drugId || !rxForm.quantity) return
    setSubmitting(true)
    try {
      await createPrescription({
        visitId: activeVisit.id,
        items: [{
          drugId: Number(rxForm.drugId),
          quantity: Number(rxForm.quantity),
          usageDesc: rxForm.usageDesc || '',
        }],
      })
      setRxForm({ drugId: '', quantity: 1, usageDesc: '' })
      const data = await listPrescriptions({ visitId: activeVisit.id })
      setPrescriptions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || '开处方失败')
    } finally { setSubmitting(false) }
  }

  return (
    <PcLayout portal={portal} searchPlaceholder="搜索患者…">
      {/* Active visit detail view */}
      {activeVisit ? (
        <div className="con-pc-visit-detail">
          <button type="button" className="con-pc-back" onClick={() => setActiveVisit(null)}>← 返回列表</button>
          <h1>接诊详情 #{activeVisit.id}</h1>
          {error && <p className="con-pc-error">{error}</p>}

          <section className="con-pc-section">
            <h2>主诉与诊断</h2>
            <label className="con-pc-field">
              <span>主诉</span>
              <textarea rows={3} value={visitForm.chiefComplaint}
                onChange={(e) => setVisitForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                placeholder="如：头痛三天，伴发热…" />
            </label>
            <label className="con-pc-field">
              <span>诊断</span>
              <input value={visitForm.diagnosis}
                onChange={(e) => setVisitForm((f) => ({ ...f, diagnosis: e.target.value }))}
                placeholder="如：上呼吸道感染" />
            </label>
            <button type="button" className="con-pc-btn-primary" disabled={submitting} onClick={handleSaveVisit}>
              {submitting ? '保存中…' : '完成接诊'}
            </button>
          </section>

          {/* 检查申请 */}
          <section className="con-pc-section">
            <h2>检查申请</h2>
            <div className="con-pc-inline-form">
              <select value={examForm.itemId} onChange={(e) => setExamForm((f) => ({ ...f, itemId: e.target.value }))}>
                <option value="">选择检查项目</option>
                {medicalItems.filter((m) => m.itemType === 1 || m.itemType === 'exam' || m.itemType === '检查').map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.itemName || `项目 #${m.id}`}</option>
                ))}
              </select>
              <button type="button" className="con-pc-btn-sm" disabled={submitting || !examForm.itemId} onClick={handleAddExam}>
                开立
              </button>
            </div>
            {exams.length === 0 && <p className="con-pc-empty-sm">暂无检查申请</p>}
            {exams.map((e) => (
              <div key={e.id} className="con-pc-item">{e.itemName || e.name || `检查 #${e.id}`} {e.status != null && `· ${e.status === 1 ? '已完成' : '待执行'}`}</div>
            ))}
          </section>

          {/* 处方 */}
          <section className="con-pc-section">
            <h2>处方</h2>
            <div className="con-pc-inline-form">
              <select value={rxForm.drugId} onChange={(e) => setRxForm((f) => ({ ...f, drugId: e.target.value }))}>
                <option value="">选择药品</option>
                {drugs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name || d.drugName || `药品 #${d.id}`}</option>
                ))}
              </select>
              <input type="number" min="1" value={rxForm.quantity}
                onChange={(e) => setRxForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="数量" style={{ width: 80 }} />
              <input value={rxForm.usageDesc}
                onChange={(e) => setRxForm((f) => ({ ...f, usageDesc: e.target.value }))}
                placeholder="用法（如：一日三次）" style={{ flex: 1 }} />
              <button type="button" className="con-pc-btn-sm" disabled={submitting || !rxForm.drugId} onClick={handleAddRx}>
                开处方
              </button>
            </div>
            {prescriptions.length === 0 && <p className="con-pc-empty-sm">暂无处方</p>}
            {prescriptions.map((p) => (
              <div key={p.id} className="con-pc-item">
                {p.drugName || p.items || `处方 #${p.id}`}
                {p.status === 0 && (
                  <button type="button" className="con-pc-cancel-btn"
                    onClick={async () => { try { await cancelPrescription(p.id); const d = await listPrescriptions({ visitId: activeVisit.id }); setPrescriptions(Array.isArray(d) ? d : []) } catch(e) { alert(e.message) } }}>
                    作废
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>
      ) : (
        <>
          <div className="con-pc-toolbar">
            <h1 className="con-pc-title">接诊管理</h1>
            <div className="con-pc-tabs">
              <button className={`con-pc-tab${tab === 'pending' ? ' con-pc-tab--active' : ''}`} onClick={() => setTab('pending')}>待诊</button>
              <button className={`con-pc-tab${tab === 'visits' ? ' con-pc-tab--active' : ''}`} onClick={() => setTab('visits')}>接诊记录</button>
            </div>
          </div>

          {error && <p className="con-pc-error">{error}</p>}

          {tab === 'pending' && (
            <>
              {loading && <Skeleton variant="card" count={4} />}
              {!loading && pendingRegs.length === 0 && <p className="con-pc-empty">暂无待诊患者</p>}
              <div className="con-pc-list">
                {pendingRegs.map((r) => (
                  <div key={r.id} className="con-pc-card">
                    <div className="con-pc-card-body">
                      <strong>{r.patientName || `患者 #${r.patientId}`}</strong>
                      <span>{r.deptName || '—'} · {r.scheduleDate || ''}</span>
                    </div>
                    <button type="button" className="con-pc-start-btn" disabled={submitting}
                      onClick={() => handleStartVisit(r.id)}>
                      {submitting ? '…' : '开始接诊'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'visits' && (
            <>
              {loading && <Skeleton variant="card" count={4} />}
              {!loading && visits.length === 0 && <p className="con-pc-empty">暂无接诊记录</p>}
              <div className="con-pc-list">
                {visits.map((v) => {
                  const si = VISIT_STATUS_MAP[v.status] ?? { label: `状态${v.status}`, cls: '' }
                  return (
                    <div key={v.id} className="con-pc-card">
                      <div className="con-pc-card-body">
                        <strong>{v.patientName || `就诊 #${v.id}`}</strong>
                        <span>{v.chiefComplaint ? `主诉：${v.chiefComplaint}` : '—'}</span>
                        {v.diagnosis && <span className="con-pc-diagnosis">诊断：{v.diagnosis}</span>}
                      </div>
                      <div className="con-pc-card-right">
                        <span className={`con-pc-status ${si.cls}`}>{si.label}</span>
                        <button type="button" className="con-pc-link-btn" onClick={() => loadVisitDetail(v)}>
                          查看详情
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </PcLayout>
  )
}
