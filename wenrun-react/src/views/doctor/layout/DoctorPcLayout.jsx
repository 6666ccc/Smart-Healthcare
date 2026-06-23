import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { useLogout } from '../../../hooks'
import { IconLogo, IconHome, IconQueue, IconLogout } from '../../shared'
import '../../shared/views.css'

const NAV_ITEMS = [
  { to: '/doctor/home',  icon: IconHome,  label: '工作台' },
  { to: '/doctor/queue', icon: IconQueue, label: '待诊队列' },
]

export default function DoctorPcLayout({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const logout = useLogout()

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="layout-pc">
      <div className="amber-line" />
      <aside className="layout-pc__sidebar glass-sidebar">
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--c-border-light)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, #3d5a5c, #556f71)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconLogo size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '1rem', color: 'var(--c-brand)' }}>
              温润诊所
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--c-muted)', letterSpacing: '0.06em' }}>医生工作站</div>
          </div>
        </div>

        <nav style={{ padding: '12px 12px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.to)
            return (
              <Link key={item.to} to={item.to} className={`pc-nav-link${active ? ' pc-nav-link--active' : ''}`}>
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="view-avatar-ring" style={{ width: 40, height: 40, margin: 0, padding: 2 }}>
              <div className="view-avatar-ring__inner" style={{ fontSize: 16 }}>
                {(user?.realName || user?.username || '?')[0]}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.realName || user?.username || '医生'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>医生端</div>
            </div>
          </div>
          <button onClick={logout} className="pc-nav-link" style={{ fontSize: '0.8rem' }}>
            <IconLogout />
            退出登录
          </button>
        </div>
      </aside>

      <div className="layout-pc__main">
        <header style={{
          height: 'var(--header-h)', borderBottom: '1px solid var(--c-border-light)',
          display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0,
          background: 'rgba(255, 253, 249, 0.7)', backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>温润诊所 · 医生诊疗工作站</div>
        </header>
        <div className="layout-pc__content">{children}</div>
        <footer style={{
          borderTop: '1px solid var(--c-border-light)', padding: '12px 28px',
          fontSize: '0.75rem', color: 'var(--c-muted)', flexShrink: 0,
        }}>
          温润诊所 Warm Clinic © 2026 · 医生端
        </footer>
      </div>
    </div>
  )
}
