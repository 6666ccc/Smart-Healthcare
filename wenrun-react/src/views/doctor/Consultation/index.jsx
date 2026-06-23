import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { useIsPc } from '../../../hooks'
import {
  getVisit, updateVisit, listPrescriptions, createPrescription,
  listExamRequests, createExamRequest, listDrugs, listMedicalItems, getPatient,
} from '../../../api'
import {
  formatDateTime, formatMoney, VISIT_STATUS_MAP, RX_STATUS_MAP, EXAM_STATUS_MAP,
} from '../../../utils'
import { Loading, StatusBadge, ConfirmDialog } from '../../../components'
import DoctorPcLayout from '../layout/DoctorPcLayout'
import { PageBack } from '../../shared'
import '../../shared/views.css'

export default function DoctorConsultation() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const isPc = useIsPc()
  const { user } = useAuth()

  const [visit, setVisit] = useState(null)
  const [patient, setPatient] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [exams, setExams] = useState([])
  const [drugs, setDrugs] = useState([])
  const [medicalItems, setMedicalItems] = useState([])

  const [form, setForm] = useState({ chiefComplaint: '', diagnosis: '' })
  const [rxForm, setRxForm] = useState({ drugId: '', quantity: '1', usageDesc: '' })
  const [examItemId, setExamItemId] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rxLoading, setRxLoading] = useState(false)
  const [examLoading, setExamLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [completeDlg, setCompleteDlg] = useState(false)

  const loadVisitData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const v = await getVisit(visitId)
      setVisit(v)
      setForm({
        chiefComplaint: v.chiefComplaint || '',
        diagnosis: v.diagnosis || '',
      })

      const [rxList, examList, drugList, itemList] = await Promise.all([
        listPrescriptions({ visitId: v.id }).catch(() => []),
        listExamRequests({ visitId: v.id }).catch(() => []),
        listDrugs({ status: 1 }).catch(() => []),
        listMedicalItems({ status: 1 }).catch(() => []),
      ])
      setPrescriptions(Array.isArray(rxList) ? rxList : [])
      setExams(Array.isArray(examList) ? examList : [])
      setDrugs(Array.isArray(drugList) ? drugList : [])
      setMedicalItems(Array.isArray(itemList) ? itemList : [])

      if (v.patientId) {
        try {
          const p = await getPatient(v.patientId)
          setPatient(p)
        } catch { /* ignore */ }
      }
    } catch (e) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => { loadVisitData() }, [loadVisitData])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    setError('')
    try {
      await updateVisit(visitId, {
        chiefComplaint: form.chiefComplaint,
        diagnosis: form.diagnosis,
      })
      setMsg('病历已保存')
      await loadVisitData()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    setError('')
    try {
      await updateVisit(visitId, {
        chiefComplaint: form.chiefComplaint,
        diagnosis: form.diagnosis,
        complete: true,
      })
      setCompleteDlg(false)
      navigate('/doctor/home', { replace: true })
    } catch (e) {
      setError(e.message || '完成就诊失败')
      setCompleteDlg(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRx = async () => {
    if (!rxForm.drugId) {
      setError('请选择药品')
      return
    }
    setRxLoading(true)
    setError('')
    try {
      await createPrescription({
        visitId: Number(visitId),
        items: [{
          drugId: Number(rxForm.drugId),
          quantity: Number(rxForm.quantity) || 1,
          usageDesc: rxForm.usageDesc || undefined,
        }],
      })
      setRxForm({ drugId: '', quantity: '1', usageDesc: '' })
      setMsg('处方已开立')
      const rxList = await listPrescriptions({ visitId: Number(visitId) })
      setPrescriptions(Array.isArray(rxList) ? rxList : [])
    } catch (e) {
      setError(e.message || '开方失败')
    } finally {
      setRxLoading(false)
    }
  }

  const handleAddExam = async () => {
    if (!examItemId) {
      setError('请选择检查项目')
      return
    }
    setExamLoading(true)
    setError('')
    try {
      await createExamRequest({
        visitId: Number(visitId),
        itemId: Number(examItemId),
      })
      setExamItemId('')
      setMsg('检查申请已提交')
      const examList = await listExamRequests({ visitId: Number(visitId) })
      setExams(Array.isArray(examList) ? examList : [])
    } catch (e) {
      setError(e.message || '开检查失败')
    } finally {
      setExamLoading(false)
    }
  }

  const drugName = (id) => drugs.find((d) => d.id === id)?.drugName || `药品#${id}`
  const itemName = (id) => medicalItems.find((i) => i.id === id)?.itemName || `项目#${id}`
  const isCompleted = visit?.status === 2

  const content = (
    <div className="page">
      <PageBack onClick={() => navigate('/doctor/home')} label="返回工作台" />

      {error && <div className="card" style={{ color: 'var(--c-danger)', marginBottom: 12 }}>{error}</div>}
      {msg && <div className="card" style={{ color: 'var(--c-brand)', marginBottom: 12 }}>{msg}</div>}
      {loading ? <Loading /> : !visit ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--c-sub)' }}>就诊记录不存在</div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 患者信息 */}
          <div className="card">
            <div className="flex-between mb-md">
              <h2 style={{ margin: 0 }}>接诊 · {visit.patientName}</h2>
              <StatusBadge status={visit.status} map={VISIT_STATUS_MAP} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <Info label="就诊编号" value={visit.visitNo} />
              <Info label="接诊医生" value={visit.staffName || user?.realName} />
              <Info label="就诊时间" value={formatDateTime(visit.visitTime)} />
              <Info label="患者编号" value={patient?.patientNo} />
              <Info label="联系电话" value={patient?.phone} />
              <Info label="过敏史" value={patient?.allergyHistory || '无'} />
            </div>
          </div>

          {/* 病历录入 */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0' }}>病历录入</h3>
            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 6 }}>主诉</label>
            <textarea
              className="input"
              rows={3}
              value={form.chiefComplaint}
              disabled={isCompleted}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
              placeholder="患者主要症状与诉求"
              style={{ width: '100%', marginBottom: 12, resize: 'vertical' }}
            />
            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: 6 }}>诊断</label>
            <textarea
              className="input"
              rows={3}
              value={form.diagnosis}
              disabled={isCompleted}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="初步诊断或诊疗意见"
              style={{ width: '100%', marginBottom: 16, resize: 'vertical' }}
            />
            {!isCompleted && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--outline" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存病历'}
                </button>
                <button className="btn btn--primary" onClick={() => setCompleteDlg(true)} disabled={saving}>
                  完成就诊
                </button>
              </div>
            )}
          </div>

          {/* 处方 */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0' }}>处方</h3>
            {prescriptions.length > 0 ? prescriptions.map((rx) => (
              <div key={rx.id} style={{
                marginBottom: 12, padding: 14, background: 'var(--c-bg)', borderRadius: 'var(--radius)',
              }}>
                <div className="flex-between mb-sm">
                  <span style={{ fontWeight: 600 }}>{rx.rxNo}</span>
                  <StatusBadge status={rx.status} map={RX_STATUS_MAP} />
                </div>
                <div className="text-sm text-sub">合计 {formatMoney(rx.totalAmount)}</div>
                {rx.items?.map((item, i) => (
                  <div key={i} className="text-sm" style={{ marginTop: 6 }}>
                    {drugName(item.drugId)} × {item.quantity}
                    {item.usageDesc && ` · ${item.usageDesc}`}
                  </div>
                ))}
              </div>
            )) : <p className="text-muted text-sm">暂无处方</p>}

            {!isCompleted && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-border-light)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                  <select
                    className="input"
                    value={rxForm.drugId}
                    onChange={(e) => setRxForm({ ...rxForm, drugId: e.target.value })}
                  >
                    <option value="">选择药品</option>
                    {drugs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.drugName} {d.spec ? `(${d.spec})` : ''} · {formatMoney(d.price)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={rxForm.quantity}
                    onChange={(e) => setRxForm({ ...rxForm, quantity: e.target.value })}
                    placeholder="数量"
                  />
                </div>
                <input
                  className="input"
                  value={rxForm.usageDesc}
                  onChange={(e) => setRxForm({ ...rxForm, usageDesc: e.target.value })}
                  placeholder="用法用量（选填）"
                  style={{ width: '100%', marginBottom: 10 }}
                />
                <button className="btn btn--outline btn--sm" onClick={handleAddRx} disabled={rxLoading}>
                  {rxLoading ? '提交中…' : '+ 开立处方'}
                </button>
              </div>
            )}
          </div>

          {/* 检查申请 */}
          <div className="card">
            <h3 style={{ margin: '0 0 12px 0' }}>检查申请</h3>
            {exams.length > 0 ? exams.map((exam) => (
              <div key={exam.id} className="flex-between" style={{
                marginBottom: 10, padding: 12, background: 'var(--c-bg)', borderRadius: 'var(--radius)',
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{itemName(exam.itemId)}</div>
                  <div className="text-sub text-sm">{exam.requestNo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={exam.status} map={EXAM_STATUS_MAP} />
                  <div className="text-sm">{formatMoney(exam.amount)}</div>
                </div>
              </div>
            )) : <p className="text-muted text-sm">暂无检查申请</p>}

            {!isCompleted && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-border-light)', display: 'flex', gap: 10 }}>
                <select
                  className="input"
                  value={examItemId}
                  onChange={(e) => setExamItemId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">选择检查/检验项目</option>
                  {medicalItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName} · {formatMoney(item.price)}
                    </option>
                  ))}
                </select>
                <button className="btn btn--outline btn--sm" onClick={handleAddExam} disabled={examLoading}>
                  {examLoading ? '提交中…' : '开检查'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        show={completeDlg}
        title="完成就诊"
        message="确认完成本次就诊？完成后将同步至患者知识库。"
        loading={saving}
        onConfirm={handleComplete}
        onCancel={() => setCompleteDlg(false)}
      />
    </div>
  )

  if (isPc) return <DoctorPcLayout>{content}</DoctorPcLayout>
  return content
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-muted text-sm">{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
