import { Link, useLocation } from 'react-router-dom'

const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconQueue = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
  </svg>
)

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
          <Link key={tab.to} to={tab.to} className={`mobile-tabbar__item${active ? ' mobile-tabbar__item--active' : ''}`}>
            <Icon />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
