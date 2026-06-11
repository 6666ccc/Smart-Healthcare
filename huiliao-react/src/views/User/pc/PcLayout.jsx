import { useNavigate, useLocation } from 'react-router-dom'
import { useLogout } from '../../../hooks/useLogout'
import { useAuth } from '../../../store'
import {
  SIDEBAR_BOTTOM_BY_PORTAL,
  SIDEBAR_NAV_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown,
  IconHeadset,
  IconLogo,
  IconMessage,
  NavIcon,
} from '../../Home/icons'
import './index.css'
import '../../Home/pc/index.css'

export default function UserPcLayout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { logout, loggingOut } = useLogout()

  const portal = getPortalType(user)
  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const portalLabel = getPortalLabel(portal)

  const isActiveNav = (path) => {
    if (path === '/user') return pathname === '/user'
    return pathname === path || (path === '/home' && pathname === '/')
  }

  const displayName = user?.realName || user?.username || '用户'
  const displayInitial = displayName.charAt(0)

  return (
    <div className={`user-pc home-pc home-pc--${portal}`}>
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
              className={`home-pc-nav-item home-pc-nav-item--sub${
                item.path === '/user' && pathname === '/user' ? ' home-pc-nav-item--active' : ''
              }`}
              onClick={() => navigate(item.path)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}

          {portal === 'admin' && (
            <div className="home-pc-support">
              <span className="home-pc-support-icon"><IconHeadset /></span>
              <span className="home-pc-support-text">
                <strong>IT 支持</strong>
                <span>内线 8000 · 7×24 小时</span>
              </span>
            </div>
          )}

          <button
            type="button"
            className="home-pc-logout-btn"
            disabled={loggingOut}
            onClick={logout}
          >
            {loggingOut ? '退出中…' : '退出登录'}
          </button>
        </div>
      </aside>

      <div className="home-pc-main">
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital" onClick={() => navigate('/home')}>
            <span>杭州市第一人民医院</span>
            <IconChevronDown />
          </button>

          <h1 className="user-pc-header-title">个人中心</h1>

          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn" aria-label="消息">
              <IconMessage />
            </button>
            <div className="home-pc-user home-pc-user--static">
              <span className="home-pc-user-avatar">{displayInitial}</span>
              <span className="home-pc-user-info">
                <strong>{displayName}</strong>
                <span>{user?.roleName || portalLabel}</span>
              </span>
            </div>
          </div>
        </header>

        <div className="home-pc-body user-pc-body">{children}</div>

        <footer className="home-pc-footer">
          <p>© 2025 杭州市第一人民医院 · 浙ICP备05012345号-1</p>
          <div className="home-pc-footer-links">
            <button type="button">隐私政策</button>
            <span aria-hidden>·</span>
            <button type="button">服务协议</button>
            <span aria-hidden>·</span>
            <button type="button">帮助中心</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
