import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listSchedules, createSchedule } from '../../../api/modules/schedule'
import { listDepts } from '../../../api/modules/department'
import { listStaff } from '../../../api/modules/staff'
import {
  SIDEBAR_NAV_BY_PORTAL, SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown, IconHeadset, IconLogo, IconMessage, IconSearch, IconSparkles, NavIcon,
} from '../../Home/icons'
import { formatDate, PERIOD_MAP } from '../../../utils'
import '../../Home/pc/index.css'
import './index.css'

const emptyForm = { deptId: '', staffId: '', workDate: '', period: 'all', maxPatients: 30 }

export default function ScheduleManagePc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'

  const [schedules, setSchedules] = useState([])
  const [depts, setDepts] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [showCreate, setShowCreate] = useState(false)
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
      if (filterDept) params.deptId = filterDept
      if (filterDate) params.workDate = filterDate
      const [schData, deptData, staffData] = await Promise.allSettled([
        listSchedules(params), listDepts(), listStaff(),
      ])
      if (schData.status === 'fulfilled') setSchedules(Array.isArray(schData.value) ? schData.value : [])
      if (deptData.status === 'fulfilled') setDepts(Array.isArray(deptData.value) ? deptData.value : [])
      if (staffData.status === 'fulfilled') setStaffList(Array.isArray(staffData.value) ? staffData.value : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filterDept, filterDate])

  useEffect(() => { loadData() }, [loadData])

  const filteredStaff = useMemo(() => {
    if (!form.deptId) return staffList
    return staffList.filter((s) => String(s.deptId) === String(form.deptId))
  }, [staffList, form.deptId])

  const handleCreate = async () => {
    setError('')
    if (!form.deptId || !form.staffId || !form.workDate) { setError('请填写科室、医生和工作日期'); return }
    setSubmitting(true)
    try {
      await createSchedule({
        deptId: Number(form.deptId),
        staffId: Number(form.staffId),
        workDate: form.workDate,
        period: form.period,
        maxPatients: Number(form.maxPatients) || 30,
      })
      setShowCreate(false)
      setForm(emptyForm)
      loadData()
    } catch (err) {
      setError(err.message || '创建排班失败')
    } finally { setSubmitting(false) }
  }

  const getDeptName = (deptId) => {
    const d = depts.find((x) => String(x.id) === String(deptId))
    return d?.name || d?.deptName || `科室 #${deptId}`
  }

  const getStaffName = (staffId) => {
    const s = staffList.find((x) => String(x.id) === String(staffId))
    return s?.name || s?.realName || `医生 #${staffId}`
  }

  return (
    <div className={`sch-pc home-pc home-pc--${portal}`}>
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
            <IconSearch /><input type="search" placeholder="搜索排班…" />
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
          <div className="sch-pc-toolbar">
            <h1 className="sch-pc-title">排班管理</h1>
            <div className="sch-pc-filters">
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="">全部科室</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name || d.deptName || `科室 #${d.id}`}</option>
                ))}
              </select>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} placeholder="筛选日期" />
            </div>
            <button type="button" className="sch-pc-create-btn" onClick={() => { setForm(emptyForm); setError(''); setShowCreate(true) }}>
              + 新增排班
            </button>
          </div>

          {loading && <p className="sch-pc-empty">加载中…</p>}
          {!loading && schedules.length === 0 && <p className="sch-pc-empty">暂无排班记录</p>}

          <div className="sch-pc-list">
            {schedules.map((s) => (
              <div key={s.id} className="sch-pc-card">
                <div className="sch-pc-card-body">
                  <strong>{getStaffName(s.staffId)}</strong>
                  <span>{getDeptName(s.deptId)} · {s.workDate || '—'} · {PERIOD_MAP[s.period] || s.period || '全天'}</span>
                  {s.maxPatients && <span className="sch-pc-quota">限额：{s.maxPatients} 人</span>}
                </div>
                <div className="sch-pc-card-right">
                  <span className="sch-pc-id">#{s.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showCreate && (
          <div className="sch-pc-overlay" onClick={() => { setShowCreate(false); setError('') }}>
            <div className="sch-pc-modal" onClick={(e) => e.stopPropagation()}>
              <h2>新增排班</h2>
              {error && <p className="shared-error">{error}</p>}
              <div className="sch-pc-form">
                <label className="sch-pc-field">
                  <span>科室 *</span>
                  <select value={form.deptId} onChange={(e) => setForm((f) => ({ ...f, deptId: e.target.value, staffId: '' }))}>
                    <option value="">选择科室</option>
                    {depts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name || d.deptName || `科室 #${d.id}`}</option>
                    ))}
                  </select>
                </label>
                <label className="sch-pc-field">
                  <span>医生 *</span>
                  <select value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
                    <option value="">选择医生</option>
                    {filteredStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name || s.realName || `医生 #${s.id}`}</option>
                    ))}
                  </select>
                </label>
                <div className="sch-pc-row">
                  <label className="sch-pc-field">
                    <span>工作日期 *</span>
                    <input type="date" value={form.workDate} onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))} />
                  </label>
                  <label className="sch-pc-field">
                    <span>时段</span>
                    <select value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}>
                      <option value="all">全天</option>
                      <option value="am">上午</option>
                      <option value="pm">下午</option>
                    </select>
                  </label>
                </div>
                <label className="sch-pc-field">
                  <span>接诊限额</span>
                  <input type="number" min="1" value={form.maxPatients} onChange={(e) => setForm((f) => ({ ...f, maxPatients: e.target.value }))} />
                </label>
              </div>
              <div className="sch-pc-modal-actions">
                <button type="button" className="shared-btn-cancel" onClick={() => { setShowCreate(false); setError('') }}>取消</button>
                <button type="button" className="shared-btn-submit" disabled={submitting} onClick={handleCreate}>
                  {submitting ? '提交中…' : '确认新增'}
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
