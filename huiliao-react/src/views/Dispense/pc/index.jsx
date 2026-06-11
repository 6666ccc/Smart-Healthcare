import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listPendingDispensePrescriptions } from '../../../api/modules/consultation'
import { dispensePrescription } from '../../../api/modules/payment'
import {
  SIDEBAR_NAV_BY_PORTAL, SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown, IconHeadset, IconLogo, IconMessage, IconSearch, IconSparkles, NavIcon,
} from '../../Home/icons'
import { formatDateTime } from '../../../utils'
import '../../Home/pc/index.css'
import './index.css'

export default function DispensePc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'

  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dispensing, setDispensing] = useState(null)

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPendingDispensePrescriptions()
      setPrescriptions(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDispense = async (id) => {
    if (!window.confirm('确认发药？')) return
    setDispensing(id)
    try {
      await dispensePrescription(id)
      loadData()
    } catch (err) {
      alert(err.message || '发药失败')
    } finally { setDispensing(null) }
  }

  return (
    <div className={`disp-pc home-pc home-pc--${portal}`}>
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
            <IconSearch /><input type="search" placeholder="搜索处方…" />
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
          <h1 className="disp-pc-title">发药管理</h1>

          {loading && <p className="disp-pc-empty">加载中…</p>}
          {!loading && prescriptions.length === 0 && <p className="disp-pc-empty">暂无待发药处方</p>}

          <div className="disp-pc-list">
            {prescriptions.map((p) => (
              <div key={p.id} className="disp-pc-card">
                <div className="disp-pc-card-body">
                  <strong>{p.patientName || `处方 #${p.id}`}</strong>
                  <span className="disp-pc-drugs">{p.drugNames || p.items || '—'}</span>
                  {p.createTime && <span className="disp-pc-time">{formatDateTime(p.createTime)}</span>}
                </div>
                <div className="disp-pc-card-right">
                  <span className="disp-pc-status">待发药</span>
                  <button type="button" className="disp-pc-dispense-btn"
                    disabled={dispensing === p.id}
                    onClick={() => handleDispense(p.id)}>
                    {dispensing === p.id ? '发药中…' : '确认发药'}
                  </button>
                </div>
              </div>
            ))}
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
