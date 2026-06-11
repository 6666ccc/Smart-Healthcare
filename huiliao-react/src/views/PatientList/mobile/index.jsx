import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { listPatients, createPatient, updatePatient } from '../../../api/modules/patient'
import { getPortalType } from '../../Home/role'
import { GENDER_MAP } from '../../../utils'
import MobileTabbar from '../../Home/MobileTabbar'
import { IconPlus } from '../../Assistant/icons'
import './index.css'

const emptyForm = { name: '', phone: '', idCard: '', gender: 1, birthDate: '', allergyHistory: '', address: '' }

export default function PatientListMobile() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (keyword.trim()) params.name = keyword.trim()
      const data = await listPatients(params)
      setPatients(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [keyword])

  useEffect(() => { loadData() }, [loadData])

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setError(''); setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name || p.realName || '',
      phone: p.phone || '',
      idCard: p.idCard || '',
      gender: p.gender ?? 1,
      birthDate: p.birthDate || '',
      allergyHistory: p.allergyHistory || '',
      address: p.address || '',
    })
    setError(''); setShowForm(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('请输入患者姓名'); return }
    setSubmitting(true)
    try {
      if (editing) await updatePatient(editing.id, form)
      else await createPatient(form)
      setShowForm(false); setEditing(null); loadData()
    } catch (err) { setError(err.message || '保存失败') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="pat-page">
      <header className="pat-header">
        <h1>患者管理</h1>
        <button type="button" className="pat-header-add" onClick={openCreate}><IconPlus /></button>
      </header>

      <div className="pat-search-bar">
        <input type="search" placeholder="搜索患者姓名…" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadData() }} />
        <button type="button" onClick={loadData}>搜索</button>
      </div>

      <main className="pat-main">
        {loading && <p className="pat-empty">加载中…</p>}
        {!loading && patients.length === 0 && <p className="pat-empty">暂无患者记录</p>}
        {patients.map((p) => (
          <div key={p.id} className="pat-card" onClick={() => openEdit(p)}>
            <div className="pat-card-body">
              <div className="pat-card-top">
                <strong>{p.name || p.realName || `患者 #${p.id}`}</strong>
                <span className="pat-gender">{GENDER_MAP[p.gender] ?? '—'}</span>
              </div>
              <div className="pat-meta">
                {p.phone && <span>📞 {p.phone}</span>}
                {p.idCard && <span>🪪 {p.idCard}</span>}
              </div>
              {p.allergyHistory && <span className="pat-allergy">⚠️ {p.allergyHistory}</span>}
            </div>
            <span className="pat-arrow">›</span>
          </div>
        ))}
      </main>

      {showForm && (
        <div className="pat-overlay" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>
          <div className="pat-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? '编辑患者' : '新建患者'}</h2>
            {error && <p className="shared-error">{error}</p>}
            <label className="pat-field">
              <span>姓名 *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="患者姓名" />
            </label>
            <label className="pat-field">
              <span>手机号</span>
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="手机号" />
            </label>
            <label className="pat-field">
              <span>身份证号</span>
              <input value={form.idCard} onChange={(e) => setForm((f) => ({ ...f, idCard: e.target.value }))} placeholder="身份证号" />
            </label>
            <div className="pat-row">
              <label className="pat-field">
                <span>性别</span>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: Number(e.target.value) }))}>
                  <option value={1}>男</option>
                  <option value={0}>女</option>
                  <option value={2}>未知</option>
                </select>
              </label>
              <label className="pat-field">
                <span>出生日期</span>
                <input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
              </label>
            </div>
            <label className="pat-field">
              <span>过敏史</span>
              <input value={form.allergyHistory} onChange={(e) => setForm((f) => ({ ...f, allergyHistory: e.target.value }))} placeholder="如：青霉素过敏" />
            </label>
            <button type="button" className="shared-btn-submit" style={{ width: '100%', marginTop: '.5rem' }} disabled={submitting} onClick={handleSave}>
              {submitting ? '保存中…' : (editing ? '保存修改' : '确认建档')}
            </button>
          </div>
        </div>
      )}

      <MobileTabbar portal={portal} />
    </div>
  )
}
