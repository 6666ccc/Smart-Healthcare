import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listPatients, createPatient, updatePatient } from '../../../api/modules/patient'
import {
  SIDEBAR_NAV_BY_PORTAL, SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown, IconHeadset, IconLogo, IconMessage, IconSearch, IconSparkles, NavIcon,
} from '../../Home/icons'
import { formatDateTime, GENDER_MAP } from '../../../utils'
import '../../Home/pc/index.css'
import './index.css'

const emptyForm = { name: '', phone: '', idCard: '', gender: 1, birthDate: '', allergyHistory: '', address: '' }

export default function PatientListPc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path

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
    <div className={`pat-pc home-pc home-pc--${portal}`}>
      <aside className="home-pc-sidebar">
        <div className="home-pc-brand">
          <span className="home-pc-brand-logo"><IconLogo /></span>
          <span className="home-pc-brand-text"><strong>慧疗</strong><span>{portalLabel}</span></span>
        </div>
        <nav className="home-pc-nav">
          {sidebarNav.map((item) => (
            <button key={item.id} type="button"
              className={`home-pc-nav-item${isActiveNav(item.path) ? ' home-pc-nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}>
              <NavIcon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="home-pc-sidebar-bottom">
          {sidebarBottom.map((item) => (
            <button key={item.id} type="button" className="home-pc-nav-item home-pc-nav-item--sub"
              onClick={() => navigate(item.path)}>
              <NavIcon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
          <button type="button" className="home-pc-ai-btn" onClick={() => navigate('/assistant')}>
            <IconSparkles /><span>AI 助手</span>
          </button>
        </div>
      </aside>

      <div className="home-pc-main">
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital">
            <span>杭州市第一人民医院</span><IconChevronDown />
          </button>
          <label className="home-pc-search">
            <IconSearch />
            <input type="search" placeholder="搜索患者姓名…" value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
          </label>
          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn"><IconMessage /></button>
            <button type="button" className="home-pc-user" onClick={() => navigate('/user')}>
              <span className="home-pc-user-avatar">{displayName.charAt(0)}</span>
              <span className="home-pc-user-info"><strong>{displayName}</strong><span>{user?.roleName || portalLabel}</span></span>
            </button>
          </div>
        </header>

        <div className="home-pc-body">
          <div className="pat-pc-toolbar">
            <h1 className="pat-pc-title">患者管理</h1>
            <button type="button" className="pat-pc-create-btn" onClick={openCreate}>+ 新建患者</button>
          </div>

          {loading && <p className="pat-pc-empty">加载中…</p>}
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

        <footer className="home-pc-footer">
          <p>© 2025 杭州市第一人民医院 · 浙ICP备05012345号-1</p>
          <div className="home-pc-footer-links">
            <button type="button">隐私政策</button><span>·</span>
            <button type="button">服务协议</button><span>·</span>
            <button type="button">帮助中心</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
