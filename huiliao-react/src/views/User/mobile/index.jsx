import { useNavigate } from 'react-router-dom'
import { useLogout } from '../../../hooks/useLogout'
import MobileTabbar from '../../Home/MobileTabbar'
import { IconBack } from '../icons'
import { useUserProfile } from '../useUserProfile'
import './index.css'

export default function UserMobile() {
  const navigate = useNavigate()
  const { logout, loggingOut } = useLogout()
  const { displayName, displayInitial, portal, portalLabel, infoRows, user } = useUserProfile()

  return (
    <div className="user-page">
      <header className="user-header">
        <button type="button" className="user-back" aria-label="返回" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <h1 className="user-header-title">个人中心</h1>
      </header>

      <main className="user-main">
        <section className="user-profile-card">
          <span className="user-avatar" aria-hidden>
            {displayInitial}
          </span>
          <div className="user-profile-body">
            <span className="user-portal-tag">{portalLabel}</span>
            <h2>{displayName}</h2>
            <p className="user-profile-meta">{user?.roleName || portalLabel}</p>
            <p className="user-profile-sub">慧疗智慧医疗</p>
          </div>
        </section>

        <ul className="user-info-list">
          {infoRows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <span>{row.value ?? '—'}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="user-logout-btn"
          disabled={loggingOut}
          onClick={logout}
        >
          {loggingOut ? '退出中…' : '退出登录'}
        </button>
        <p className="user-logout-hint">退出后将清除本机登录状态</p>
      </main>

      <MobileTabbar portal={portal} />
    </div>
  )
}
