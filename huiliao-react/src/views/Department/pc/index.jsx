import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listDepts } from '../../../api/modules/department'
import { listStaff } from '../../../api/modules/staff'
import {
  SIDEBAR_NAV_BY_PORTAL, SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown, IconHeadset, IconLogo, IconMessage, IconSearch, IconSparkles, NavIcon,
} from '../../Home/icons'
import '../../Home/pc/index.css'
import './index.css'

export default function DepartmentPc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'

  const [depts, setDepts] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)
  const [staffLoading, setStaffLoading] = useState(false)

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path

  const loadDepts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listDepts()
      setDepts(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDepts() }, [loadDepts])

  const handleSelect = useCallback(async (dept) => {
    setSelectedDept(dept)
    setStaffLoading(true)
    try {
      const data = await listStaff({ deptId: dept.id })
      setStaffList(Array.isArray(data) ? data : [])
    } catch { setStaffList([]) }
    finally { setStaffLoading(false) }
  }, [])

  return (
    <div className={`dept-pc home-pc home-pc--${portal}`}>
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
            <IconSearch /><input type="search" placeholder="搜索科室…" />
          </label>
          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn"><IconMessage /></button>
            <button type="button" className="home-pc-user" onClick={() => navigate('/user')}>
              <span className="home-pc-user-avatar">{displayName.charAt(0)}</span>
              <span className="home-pc-user-info"><strong>{displayName}</strong><span>{user?.roleName || portalLabel}</span></span>
            </button>
          </div>
        </header>

        <div className="home-pc-body dept-pc-body">
          <div className="dept-pc-grid">
            {/* 科室列表 */}
            <div className="dept-pc-list-panel">
              <h1 className="dept-pc-title">科室查询</h1>
              {loading && <p className="dept-pc-empty">加载中…</p>}
              {!loading && depts.length === 0 && <p className="dept-pc-empty">暂未开放科室</p>}
              <div className="dept-pc-list">
                {depts.map((d) => (
                  <button key={d.id} type="button"
                    className={`dept-pc-item${selectedDept?.id === d.id ? ' dept-pc-item--active' : ''}`}
                    onClick={() => handleSelect(d)}>
                    <span className="dept-pc-item-icon">{(d.name || d.deptName || '科').charAt(0)}</span>
                    <div className="dept-pc-item-body">
                      <strong>{d.name || d.deptName || `科室 #${d.id}`}</strong>
                      {d.description && <span>{d.description}</span>}
                    </div>
                    <span className="dept-pc-item-status" style={{ color: d.status === 1 ? '#5a9e8f' : '#9ca3af' }}>
                      {d.status === 1 ? '开诊' : '停诊'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 科室详情 + 医护人员 */}
            <div className="dept-pc-detail-panel">
              {!selectedDept ? (
                <div className="dept-pc-placeholder">
                  <p>← 请选择左侧科室查看详情</p>
                </div>
              ) : (
                <>
                  <h2>{selectedDept.name || selectedDept.deptName}</h2>
                  {selectedDept.description && <p className="dept-pc-desc">{selectedDept.description}</p>}
                  <div className="dept-pc-info">
                    <span>状态：{selectedDept.status === 1 ? '🟢 开诊' : '⚫ 停诊'}</span>
                    {selectedDept.location && <span>位置：{selectedDept.location}</span>}
                    {selectedDept.phone && <span>电话：{selectedDept.phone}</span>}
                  </div>
                  <h3>科室医护人员</h3>
                  {staffLoading && <p className="dept-pc-empty">加载中…</p>}
                  {!staffLoading && staffList.length === 0 && <p className="dept-pc-empty">暂无医护人员</p>}
                  <div className="dept-pc-staff-list">
                    {staffList.map((s) => (
                      <div key={s.id} className="dept-pc-staff-card">
                        <span className="dept-pc-staff-avatar">{(s.name || s.realName || '医').charAt(0)}</span>
                        <div>
                          <strong>{s.name || s.realName || `员工 #${s.id}`}</strong>
                          <span>{s.title || s.position || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

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
