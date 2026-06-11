import { useNavigate, useLocation } from 'react-router-dom'
import { MOBILE_TABS_BY_PORTAL } from './data'
import { TabIcon } from './icons'
import { PORTAL } from './role'

export default function MobileTabbar({ portal }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = MOBILE_TABS_BY_PORTAL[portal] ?? MOBILE_TABS_BY_PORTAL[PORTAL.ADMIN]

  return (
    <nav className="home-tabbar" aria-label="主导航">
      {tabs.map((tab) => {
        const active = pathname === tab.path || (tab.path === '/home' && pathname === '/')
        return (
          <button
            key={tab.path}
            type="button"
            className={`home-tab-item${active ? ' home-tab-item--active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <TabIcon name={tab.icon} active={active} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
