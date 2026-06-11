import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listRegistrations, listPendingRegistrations, createRegistration, cancelRegistration } from '../../../api/modules/registration'
import { listPatients } from '../../../api/modules/patient'
import { listSchedules } from '../../../api/modules/schedule'
import { listDepts } from '../../../api/modules/department'
import {
  SIDEBAR_NAV_BY_PORTAL,
  SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown,
  IconChevronRight,
  IconHeadset,
  IconLogo,
  IconMessage,
  IconSearch,
  IconSparkles,
  NavIcon,
} from '../../Home/icons'
import '../../Home/pc/index.css'
import './index.css'

const STATUS_MAP = {
  0: { label: '已挂号', cls: 'reg-status--pending' },
  1: { label: '已接诊', cls: 'reg-status--active' },
  2: { label: '已完成', cls: 'reg-status--done' },
  3: { label: '已取消', cls: 'reg-status--cancelled' },
}

function getStatusInfo(status) {
  return STATUS_MAP[status] ?? { label: `状态${status}`, cls: '' }
}

export default function RegistrationPc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'
  const displayInitial = displayName.charAt(0)

  const [registrations, setRegistrations] = useState([])
  const [patients, setPatients] = useState([])
  const [schedules, setSchedules] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all') // all | pending
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ patientId: '', scheduleId: '', deptId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path

  const isAdmin = portal === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const fetchRegs = tab === 'pending' ? listPendingRegistrations() : listRegistrations()
      const results = await Promise.allSettled([
        fetchRegs,
        listPatients(),
        listSchedules(),
        listDepts(),
      ])
      if (results[0].status === 'fulfilled') setRegistrations(Array.isArray(results[0].value) ? results[0].value : [])
      if (results[1].status === 'fulfilled') setPatients(Array.isArray(results[1].value) ? results[1].value : [])
      if (results[2].status === 'fulfilled') setSchedules(Array.isArray(results[2].value) ? results[2].value : [])
      if (results[3].status === 'fulfilled') setDepts(Array.isArray(results[3].value) ? results[3].value : [])
    } catch {
      // 某个接口失败不影响已加载的数据
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  const filteredSchedules = useMemo(() => {
    if (!form.deptId) return schedules
    return schedules.filter((s) => String(s.deptId) === String(form.deptId))
  }, [schedules, form.deptId])

  const handleCreate = async () => {
    setError('')
    if (!form.patientId || !form.scheduleId) {
      setError('请选择患者和排班')
      return
    }
    setSubmitting(true)
    try {
      await createRegistration({
        patientId: Number(form.patientId),
        scheduleId: Number(form.scheduleId),
      })
      setShowCreate(false)
      setForm({ patientId: '', scheduleId: '', deptId: '' })
      loadData()
    } catch (err) {
      setError(err.message || '挂号失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('确认取消此挂号？')) return
    try {
      await cancelRegistration(id)
      loadData()
    } catch (err) {
      alert(err.message || '取消失败')
    }
  }

  return (
    <div className={`reg-pc home-pc home-pc--${portal}`}>
      {/* ---- 侧栏 ---- */}
      <aside className="home-pc-sidebar">
        <div className="home-pc-brand">
          <span className="home-pc-brand-logo"><IconLogo /></span>
          <span className="home-pc-brand-text">
            <strong>慧疗</strong>
            <span>{portalLabel}</span>
          </span>
        </div>
        <nav className="home-pc-nav" aria-label="主导航">
          {sidebarNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`home-pc-nav-item${isActiveNav(item.path) ? ' home-pc-nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="home-pc-sidebar-bottom">
          {sidebarBottom.map((item) => (
            <button
              key={item.id}
              type="button"
              className="home-pc-nav-item home-pc-nav-item--sub"
              onClick={() => navigate(item.path)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          {isAdmin && (
            <div className="home-pc-support">
              <span className="home-pc-support-icon"><IconHeadset /></span>
              <span className="home-pc-support-text">
                <strong>IT 支持</strong>
                <span>内线 8000 · 7×24 小时</span>
              </span>
            </div>
          )}
          <button type="button" className="home-pc-ai-btn" onClick={() => navigate('/assistant')}>
            <IconSparkles />
            <span>AI 助手</span>
          </button>
        </div>
      </aside>

      {/* ---- 主区域 ---- */}
      <div className="home-pc-main">
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital">
            <span>杭州市第一人民医院</span>
            <IconChevronDown />
          </button>
          <label className="home-pc-search">
            <IconSearch />
            <input type="search" placeholder="搜索挂号记录…" />
          </label>
          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn" aria-label="消息">
              <IconMessage />
            </button>
            <button type="button" className="home-pc-user" onClick={() => navigate('/user')}>
              <span className="home-pc-user-avatar">{displayInitial}</span>
              <span className="home-pc-user-info">
                <strong>{displayName}</strong>
                <span>{user?.roleName || portalLabel}</span>
              </span>
            </button>
          </div>
        </header>

        <div className="home-pc-body">
          <div className="reg-pc-toolbar">
            <h1 className="reg-pc-title">挂号管理</h1>
            <div className="reg-pc-tabs">
              <button className={`reg-pc-tab${tab === 'all' ? ' reg-pc-tab--active' : ''}`} onClick={() => setTab('all')}>全部</button>
              <button className={`reg-pc-tab${tab === 'pending' ? ' reg-pc-tab--active' : ''}`} onClick={() => setTab('pending')}>待诊</button>
            </div>
            {isAdmin && (
              <button type="button" className="reg-pc-create-btn" onClick={() => setShowCreate(true)}>
                + 新建挂号
              </button>
            )}
          </div>

          {/* 挂号列表 */}
          <div className="reg-pc-list">
            {loading && <p className="reg-pc-empty">加载中…</p>}
            {!loading && registrations.length === 0 && <p className="reg-pc-empty">暂无挂号记录</p>}
            {!loading && registrations.map((r) => {
              const statusInfo = getStatusInfo(r.status)
              return (
                <div key={r.id} className="reg-pc-card">
                  <div className="reg-pc-card-body">
                    <strong className="reg-pc-card-name">{r.patientName || `患者 #${r.patientId}`}</strong>
                    <span className="reg-pc-card-meta">
                      {r.deptName || '—'} · {r.scheduleDate || r.createTime || '—'}
                    </span>
                    {r.doctorName && <span className="reg-pc-card-doctor">医生：{r.doctorName}</span>}
                  </div>
                  <div className="reg-pc-card-actions">
                    <span className={`reg-pc-status ${statusInfo.cls}`}>{statusInfo.label}</span>
                    {(r.status === 0) && (
                      <button type="button" className="reg-pc-cancel-btn" onClick={() => handleCancel(r.id)}>
                        取消
                      </button>
                    )}
                    {r.status === 1 && isAdmin && (
                      <button type="button" className="reg-pc-link-btn" onClick={() => navigate(`/consultation?visit=${r.id}`)}>
                        查看接诊 <IconChevronRight />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 新建挂号弹窗 */}
          {showCreate && (
            <div className="reg-pc-modal-overlay" onClick={() => { setShowCreate(false); setError('') }}>
              <div className="reg-pc-modal" onClick={(e) => e.stopPropagation()}>
                <h2>新建挂号</h2>
                {error && <p className="reg-pc-error">{error}</p>}
                <div className="reg-pc-form">
                  <label className="reg-pc-field">
                    <span>患者</span>
                    <select value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}>
                      <option value="">请选择患者</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>{p.name || p.realName || `患者 #${p.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="reg-pc-field">
                    <span>科室（筛选排班）</span>
                    <select value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value, scheduleId: '' }))}>
                      <option value="">全部科室</option>
                      {depts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name || d.deptName || `科室 #${d.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="reg-pc-field">
                    <span>排班</span>
                    <select value={form.scheduleId} onChange={(e) => setForm((f) => ({ ...f, scheduleId: e.target.value }))}>
                      <option value="">请选择排班</option>
                      {filteredSchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.deptName || ''} {s.staffName ? `· ${s.staffName}` : ''} · {s.workDate || ''} ({s.period || '全天'})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="reg-pc-modal-actions">
                  <button type="button" className="reg-pc-btn-cancel" onClick={() => { setShowCreate(false); setError('') }}>取消</button>
                  <button type="button" className="reg-pc-btn-submit" disabled={submitting} onClick={handleCreate}>
                    {submitting ? '提交中…' : '确认挂号'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="home-pc-footer">
          <p>© 2025 杭州市第一人民医院 · 浙ICP备05012345号-1</p>
          <div className="home-pc-footer-links">
            <button type="button">隐私政策</button><span aria-hidden>·</span>
            <button type="button">服务协议</button><span aria-hidden>·</span>
            <button type="button">帮助中心</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
