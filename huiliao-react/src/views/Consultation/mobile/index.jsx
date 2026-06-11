import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listPendingRegistrations } from '../../../api/modules/registration'
import { listVisits, startVisit, updateVisit } from '../../../api/modules/consultation'
import { listExamRequests, createExamRequest } from '../../../api/modules/consultation'
import { listPrescriptions, createPrescription } from '../../../api/modules/consultation'
import { listMedicalItems } from '../../../api/modules/medicalItem'
import { listDrugs } from '../../../api/modules/drug'
import { getPortalType } from '../../Home/role'
import MobileTabbar from '../../Home/MobileTabbar'
import './index.css'

export default function ConsultationMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [pendingRegs, setPendingRegs] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')

  const [activeVisit, setActiveVisit] = useState(null)
  const [visitForm, setVisitForm] = useState({ chiefComplaint: '', diagnosis: '' })
  const [exams, setExams] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [medicalItems, setMedicalItems] = useState([])
  const [drugs, setDrugs] = useState([])
  const [examForm, setExamForm] = useState({ itemId: '' })
  const [rxForm, setRxForm] = useState({ drugId: '', quantity: 1, usageDesc: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadPending = useCallback(async () => {
    setLoading(true)
    try { const d = await listPendingRegistrations(); setPendingRegs(Array.isArray(d) ? d : []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const loadVisits = useCallback(async () => {
    setLoading(true)
    try { const d = await listVisits(); setVisits(Array.isArray(d) ? d : []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'pending') loadPending(); else loadVisits()
    Promise.allSettled([listMedicalItems(), listDrugs()]).then(([a, b]) => {
      if (a.status === 'fulfilled') setMedicalItems(Array.isArray(a.value) ? a.value : [])
      if (b.status === 'fulfilled') setDrugs(Array.isArray(b.value) ? b.value : [])
    })
  }, [tab])

  const loadVisitDetail = async (v) => {
    setActiveVisit(v)
    setVisitForm({ chiefComplaint: v.chiefComplaint || '', diagnosis: v.diagnosis || '' })
    const [ea, pa] = await Promise.allSettled([
      listExamRequests({ visitId: v.id }),
      listPrescriptions({ visitId: v.id }),
    ])
    if (ea.status === 'fulfilled') setExams(Array.isArray(ea.value) ? ea.value : [])
    if (pa.status === 'fulfilled') setPrescriptions(Array.isArray(pa.value) ? pa.value : [])
  }

  const handleStartVisit = async (rid) => {
    setSubmitting(true)
    try {
      const data = await startVisit(rid)
      const vid = data?.visitId || data?.id
      if (vid) {
        setActiveVisit({ id: vid, registrationId: rid, status: 1, chiefComplaint: '', diagnosis: '' })
        setVisitForm({ chiefComplaint: '', diagnosis: '' })
        setExams([]); setPrescriptions([])
        setTab('visits'); loadVisits()
      }
      loadPending()
    } catch (err) { setError(err.message || '开始接诊失败') }
    finally { setSubmitting(false) }
  }

  const handleSaveVisit = async () => {
    if (!activeVisit) return
    setSubmitting(true)
    try {
      await updateVisit(activeVisit.id, {
        chiefComplaint: visitForm.chiefComplaint,
        diagnosis: visitForm.diagnosis,
        complete: true,
      })
      setActiveVisit(null); loadVisits()
    } catch (err) { setError(err.message || '保存失败') }
    finally { setSubmitting(false) }
  }

  const handleAddExam = async () => {
    if (!activeVisit || !examForm.itemId) return
    setSubmitting(true)
    try {
      await createExamRequest({ visitId: activeVisit.id, itemId: Number(examForm.itemId) })
      setExamForm({ itemId: '' })
      const d = await listExamRequests({ visitId: activeVisit.id })
      setExams(Array.isArray(d) ? d : [])
    } catch (err) { setError(err.message || '开立检查失败') }
    finally { setSubmitting(false) }
  }

  const handleAddRx = async () => {
    if (!activeVisit || !rxForm.drugId) return
    setSubmitting(true)
    try {
      await createPrescription({
        visitId: activeVisit.id,
        items: [{ drugId: Number(rxForm.drugId), quantity: Number(rxForm.quantity), usageDesc: rxForm.usageDesc || '' }],
      })
      setRxForm({ drugId: '', quantity: 1, usageDesc: '' })
      const d = await listPrescriptions({ visitId: activeVisit.id })
      setPrescriptions(Array.isArray(d) ? d : [])
    } catch (err) { setError(err.message || '开处方失败') }
    finally { setSubmitting(false) }
  }

  if (activeVisit) {
    return (
      <div className="con-page">
        <header className="con-header">
          <button type="button" className="con-back" onClick={() => setActiveVisit(null)}>← 返回</button>
          <h1>接诊 #{activeVisit.id}</h1>
        </header>
        <main className="con-detail">
          {error && <p className="con-error">{error}</p>}

          <section className="con-section">
            <h2>主诉与诊断</h2>
            <label className="con-field">
              <span>主诉</span>
              <textarea rows={3} value={visitForm.chiefComplaint}
                onChange={(e) => setVisitForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
                placeholder="如：头痛三天，伴发热…" />
            </label>
            <label className="con-field">
              <span>诊断</span>
              <input value={visitForm.diagnosis}
                onChange={(e) => setVisitForm((f) => ({ ...f, diagnosis: e.target.value }))}
                placeholder="如：上呼吸道感染" />
            </label>
            <button type="button" className="con-btn-primary" disabled={submitting} onClick={handleSaveVisit}>
              {submitting ? '保存中…' : '完成接诊'}
            </button>
          </section>

          <section className="con-section">
            <h2>检查申请</h2>
            <div className="con-inline-form">
              <select value={examForm.itemId} onChange={(e) => setExamForm((f) => ({ ...f, itemId: e.target.value }))}>
                <option value="">选择检查项目</option>
                {medicalItems.filter((m) => m.itemType === 1 || m.itemType === 'exam' || m.itemType === '检查').map((m) => (
                  <option key={m.id} value={m.id}>{m.name || m.itemName || `项目 #${m.id}`}</option>
                ))}
              </select>
              <button type="button" className="con-btn-sm" disabled={submitting || !examForm.itemId} onClick={handleAddExam}>开立</button>
            </div>
            {exams.length === 0 && <p className="con-empty-sm">暂无</p>}
            {exams.map((e) => <div key={e.id} className="con-item">{e.itemName || e.name || `检查 #${e.id}`}</div>)}
          </section>

          <section className="con-section">
            <h2>处方</h2>
            <div className="con-inline-form" style={{ flexWrap: 'wrap' }}>
              <select value={rxForm.drugId} onChange={(e) => setRxForm((f) => ({ ...f, drugId: e.target.value }))}>
                <option value="">选择药品</option>
                {drugs.map((d) => <option key={d.id} value={d.id}>{d.name || d.drugName || `药品 #${d.id}`}</option>)}
              </select>
              <input type="number" min="1" value={rxForm.quantity} onChange={(e) => setRxForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="数量" />
              <input value={rxForm.usageDesc} onChange={(e) => setRxForm((f) => ({ ...f, usageDesc: e.target.value }))} placeholder="用法" />
              <button type="button" className="con-btn-sm" disabled={submitting || !rxForm.drugId} onClick={handleAddRx}>开处方</button>
            </div>
            {prescriptions.length === 0 && <p className="con-empty-sm">暂无</p>}
            {prescriptions.map((p) => <div key={p.id} className="con-item">{p.drugName || p.items || `处方 #${p.id}`}</div>)}
          </section>
        </main>
        <MobileTabbar portal={portal} />
      </div>
    )
  }

  return (
    <div className="con-page">
      <header className="con-header"><h1>接诊管理</h1></header>

      <div className="con-tabs">
        <button className={`con-tab${tab === 'pending' ? ' con-tab--active' : ''}`} onClick={() => setTab('pending')}>待诊</button>
        <button className={`con-tab${tab === 'visits' ? ' con-tab--active' : ''}`} onClick={() => setTab('visits')}>接诊记录</button>
      </div>

      <main className="con-main">
        {error && <p className="con-error">{error}</p>}
        {loading && <p className="con-empty">加载中…</p>}

        {tab === 'pending' && !loading && pendingRegs.length === 0 && <p className="con-empty">暂无待诊患者</p>}
        {tab === 'pending' && pendingRegs.map((r) => (
          <div key={r.id} className="con-card">
            <div className="con-card-body">
              <strong>{r.patientName || `患者 #${r.patientId}`}</strong>
              <span>{r.deptName || '—'} · {r.scheduleDate || ''}</span>
            </div>
            <button type="button" className="con-start-btn" disabled={submitting} onClick={() => handleStartVisit(r.id)}>
              {submitting ? '…' : '接诊'}
            </button>
          </div>
        ))}

        {tab === 'visits' && !loading && visits.length === 0 && <p className="con-empty">暂无接诊记录</p>}
        {tab === 'visits' && visits.map((v) => (
          <div key={v.id} className="con-card" onClick={() => loadVisitDetail(v)}>
            <div className="con-card-body">
              <strong>{v.patientName || `就诊 #${v.id}`}</strong>
              <span>{v.chiefComplaint || '—'}</span>
            </div>
            <span className={`con-status${v.status === 2 ? ' con-status--done' : ' con-status--active'}`}>
              {v.status === 2 ? '已完成' : '接诊中'}
            </span>
          </div>
        ))}
      </main>

      <MobileTabbar portal={portal} />
    </div>
  )
}
