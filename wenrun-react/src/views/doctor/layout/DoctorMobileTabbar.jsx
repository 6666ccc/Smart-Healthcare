import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconQueue } from '../../shared'

const TABS = [
  { to: '/doctor/home',  icon: IconHome,  label: '工作台' },
  { to: '/doctor/queue', icon: IconQueue, label: '待诊' },
]

export default function DoctorMobileTabbar() {
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
