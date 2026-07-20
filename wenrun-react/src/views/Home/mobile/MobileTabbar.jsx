import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconCalendar, IconHospital, IconWallet, IconUser } from '../../shared'

const TABS = [
  { to: '/home',         icon: IconHome,     label: '首页' },
  { to: '/registration', icon: IconCalendar, label: '挂号' },
  { to: '/department',   icon: IconHospital, label: '科室' },
  { to: '/payment',      icon: IconWallet,   label: '缴费' },
  { to: '/user',         icon: IconUser,     label: '我的' },
]

export default function MobileTabbar() {
  const location = useLocation()

  return (
    <div className="mobile-tabbar">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`mobile-tabbar__item${active ? ' mobile-tabbar__item--active' : ''}`}
          >
            <Icon size={24} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
