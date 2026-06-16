import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store'
import {
  SIDEBAR_BOTTOM_BY_PORTAL,
  SIDEBAR_NAV_BY_PORTAL,
} from '../views/Home/data'
import { getPortalLabel } from '../views/Home/role'
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
} from '../views/Home/icons'
import { formatTime } from '../utils'
import '../views/Home/pc/index.css'

/**
 * 共享 PC 端三栏布局 —— 侧边栏 + 头部 + 主体 + 底部
 *
 * 消除各业务页面中 ~60 行重复的侧边栏/头部/底部样板代码。
 * Home 页和所有业务页面（Registration / Consultation / Payment / Dispense /
 * PatientList / ScheduleManage / DrugManage / Department）统一使用此组件。
 *
 * @param {Object}   props
 * @param {string}   props.portal             门户类型 'admin' | 'doctor' | 'patient'
 * @param {ReactNode} props.children           页面主体内容
 * @param {string}   [props.greeting]          问候语副标题；传入则在 children 前渲染问候区
 * @param {string}   [props.searchPlaceholder] 搜索框占位符，默认 "搜索患者、药品、科室"
 * @param {string}   [props.searchValue]       受控搜索框值（不传则为非受控）
 * @param {Function} [props.onSearchChange]    搜索框 onChange
 * @param {Function} [props.onSearchKeyDown]   搜索框 onKeyDown
 * @param {number}   [props.pendingCount=0]    消息角标数
 * @param {number}   [props.lowStockCount=0]   库存预警角标数（仅 admin 可见）
 * @param {boolean}  [props.showAiButton=true] 侧边栏底部是否显示 AI 助手入口
 * @param {string}   [props.className]         根节点额外 class
 * @param {string}   [props.bodyClassName]     body 区域额外 class
 */
export default function PcLayout({
  portal,
  children,
  greeting,
  searchPlaceholder = '搜索患者、药品、科室',
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  pendingCount = 0,
  lowStockCount = 0,
  showAiButton = true,
  className = '',
  bodyClassName = '',
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const bodyRef = useRef(null)

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.classList.remove('anim-fade-up')
    void el.offsetWidth // force reflow
    el.classList.add('anim-fade-up')
  }, [pathname])

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isAiActive = pathname === '/assistant'
  const isAdmin = portal === 'admin'

  const isActiveNav = (path) => {
    if (path === '/home' && (pathname === '/' || pathname === '/home')) return true
    return pathname === path || pathname.startsWith(path + '/')
  }

  const displayName = user?.realName || user?.username || '用户'
  const displayInitial = displayName.charAt(0)
  const portalLabel = getPortalLabel(portal)

  return (
    <div className={`home-pc home-pc--${portal} ${className}`.trim()}>
      {/* ================================================================ */}
      {/*  侧边栏                                                           */}
      {/* ================================================================ */}
      <aside className="home-pc-sidebar">
        {/* 品牌标识 */}
        <div className="home-pc-brand">
          <span className="home-pc-brand-logo"><IconLogo /></span>
          <span className="home-pc-brand-text">
            <strong>慧疗</strong>
            <span>{portalLabel}</span>
          </span>
        </div>

        {/* 主导航 */}
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

        {/* 侧边栏底部 */}
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

          {showAiButton && (
            <button
              type="button"
              className={`home-pc-ai-btn${isAiActive ? ' home-pc-ai-btn--active' : ''}`}
              onClick={() => navigate('/assistant')}
            >
              <IconSparkles />
              <span>AI 助手</span>
            </button>
          )}
        </div>
      </aside>

      {/* ================================================================ */}
      {/*  主区域                                                           */}
      {/* ================================================================ */}
      <div className="home-pc-main">
        {/* 顶部栏 */}
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital">
            <span>杭州市第一人民医院</span>
            <IconChevronDown />
          </button>

          <label className="home-pc-search">
            <IconSearch />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
            />
          </label>

          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn" aria-label="消息">
              <IconMessage />
              {pendingCount > 0 && (
                <span className="home-pc-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
            {isAdmin && (
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

        {/* 主体 */}
        <div ref={bodyRef} className={`home-pc-body ${bodyClassName}`.trim()}>
          {/* 问候区（仅 Home 页渲染） */}
          {greeting && (
            <section className="home-pc-greeting">
              <GreetingBg />
              <div className="home-pc-greeting-text">
                <h1>
                  {formatTime()}好，{displayName}
                  <IconLeaf />
                </h1>
                <p>{greeting}</p>
              </div>
            </section>
          )}
          {children}
        </div>

        {/* 底部 */}
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
