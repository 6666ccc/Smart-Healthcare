import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { Skeleton } from '../../../components'
import { listPatients, createPatient, updatePatient } from '../../../api/modules/patient'
import { getPortalType } from '../../Home/role'
import { PcLayout } from '../../../layouts'
import { GENDER_MAP } from '../../../utils'
import './index.css'

const emptyForm = { name: '', phone: '', idCard: '', gender: 1, birthDate: '', allergyHistory: '', address: '' }

export default function PatientListPc() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
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
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowCreate(true)
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
    setError('')
    setShowCreate(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('请输入患者姓名'); return }
    setSubmitting(true)
    try {
      if (editing) {
        await updatePatient(editing.id, form)
      } else {
        await createPatient(form)
      }
      setShowCreate(false)
      setEditing(null)
      loadData()
    } catch (err) {
      setError(err.message || '保存失败')
    } finally { setSubmitting(false) }
  }

  const handleSearch = () => loadData()

  return (
    <PcLayout
      portal={portal}
      searchPlaceholder="搜索患者姓名…"
      searchValue={keyword}
      onSearchChange={(e) => setKeyword(e.target.value)}
      onSearchKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
    >
      <div className="pat-pc-toolbar">
        <h1 className="pat-pc-title">患者管理</h1>
        <button type="button" className="pat-pc-create-btn" onClick={openCreate}>+ 新建患者</button>
      </div>

      {loading && <Skeleton variant="card" count={4} />}
      {!loading && patients.length === 0 && <p className="pat-pc-empty">暂无患者记录</p>}

      <div className="pat-pc-list">
        {patients.map((p) => (
          <div key={p.id} className="pat-pc-card">
            <div className="pat-pc-card-body">
              <div className="pat-pc-card-top">
                <strong>{p.name || p.realName || `患者 #${p.id}`}</strong>
                <span className="pat-pc-gender">{GENDER_MAP[p.gender] ?? '—'}</span>
              </div>
              <div className="pat-pc-card-meta">
                {p.phone && <span>📞 {p.phone}</span>}
                {p.idCard && <span>🪪 {p.idCard}</span>}
                {p.birthDate && <span>🎂 {p.birthDate}</span>}
              </div>
              {p.allergyHistory && <span className="pat-pc-allergy">⚠️ 过敏史：{p.allergyHistory}</span>}
            </div>
            <div className="pat-pc-card-right">
              <span className="pat-pc-id">#{p.id}</span>
              <button type="button" className="pat-pc-edit-btn" onClick={() => openEdit(p)}>编辑</button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="pat-pc-overlay" onClick={() => { setShowCreate(false); setEditing(null); setError('') }}>
          <div className="pat-pc-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? '编辑患者' : '新建患者'}</h2>
            {error && <p className="shared-error">{error}</p>}
            <div className="pat-pc-form">
              <label className="pat-pc-field">
                <span>姓名 *</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="患者姓名" />
              </label>
              <label className="pat-pc-field">
                <span>手机号</span>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="手机号" />
              </label>
              <label className="pat-pc-field">
                <span>身份证号</span>
                <input value={form.idCard} onChange={(e) => setForm((f) => ({ ...f, idCard: e.target.value }))} placeholder="身份证号" />
              </label>
              <div className="pat-pc-row">
                <label className="pat-pc-field">
                  <span>性别</span>
                  <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: Number(e.target.value) }))}>
                    <option value={1}>男</option>
                    <option value={0}>女</option>
                    <option value={2}>未知</option>
                  </select>
                </label>
                <label className="pat-pc-field">
                  <span>出生日期</span>
                  <input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
                </label>
              </div>
              <label className="pat-pc-field">
                <span>过敏史</span>
                <input value={form.allergyHistory} onChange={(e) => setForm((f) => ({ ...f, allergyHistory: e.target.value }))} placeholder="如：青霉素过敏" />
              </label>
              <label className="pat-pc-field">
                <span>地址</span>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="居住地址" />
              </label>
            </div>
            <div className="pat-pc-modal-actions">
              <button type="button" className="shared-btn-cancel" onClick={() => { setShowCreate(false); setEditing(null); setError('') }}>取消</button>
              <button type="button" className="shared-btn-submit" disabled={submitting} onClick={handleSave}>
                {submitting ? '保存中…' : (editing ? '保存修改' : '确认建档')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PcLayout>
  )
}
