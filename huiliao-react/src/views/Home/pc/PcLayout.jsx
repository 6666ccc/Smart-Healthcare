import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import {
  SIDEBAR_BOTTOM_BY_PORTAL,
  SIDEBAR_NAV_BY_PORTAL,
} from '../data'
import { getPortalLabel } from '../role'
import {
  GreetingBg,
  IconBell,
  IconChevronDown,
  IconHeadset,
  IconLeaf,
  IconLogo,
  IconMessage,
  IconSearch,
  IconSparkles,
  NavIcon,
} from '../icons'
import { formatTime } from '../utils'
import './index.css'

export default function PcLayout({
  portal,
  children,
  pendingCount = 0,
  lowStockCount = 0,
  greetingSub,
  searchPlaceholder = '搜索患者、药品、科室',
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const isAiActive = pathname === '/assistant'
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path || (path === '/home' && pathname === '/')

  const displayName = user?.realName || user?.username || '用户'
  const displayInitial = displayName.charAt(0)
  const portalLabel = getPortalLabel(portal)

  return (
    <div className={`home-pc home-pc--${portal}`}>
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
            className={`home-pc-ai-btn${isAiActive ? ' home-pc-ai-btn--active' : ''}`}
            onClick={() => navigate('/assistant')}
          >
            <IconSparkles />
            <span>AI 助手</span>
          </button>
        </div>
      </aside>

      <div className="home-pc-main">
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital">
            <span>杭州市第一人民医院</span>
            <IconChevronDown />
          </button>

          <label className="home-pc-search">
            <IconSearch />
            <input type="search" placeholder={searchPlaceholder} />
          </label>

          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn" aria-label="消息">
              <IconMessage />
              {pendingCount > 0 && (
                <span className="home-pc-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
            {portal === 'admin' && (
              <button type="button" className="home-pc-icon-btn" aria-label="通知">
                <IconBell />
                {lowStockCount > 0 && <span className="home-pc-badge">{lowStockCount}</span>}
              </button>
            )}
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
          <section className="home-pc-greeting">
            <GreetingBg />
            <div className="home-pc-greeting-text">
              <h1>
                {formatTime()}好，{displayName}
                <IconLeaf />
              </h1>
              <p>{greetingSub}</p>
            </div>
          </section>
          {children}
        </div>

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
