import { useLogout } from '../../../hooks/useLogout'
import { IconShield } from '../icons'
import UserPcLayout from './PcLayout'
import { useUserProfile } from '../useUserProfile'
import './index.css'

export default function UserPc() {
  const { logout, loggingOut } = useLogout()
  const { displayName, displayInitial, portalLabel, infoRows, user } = useUserProfile()

  return (
    <UserPcLayout>
      <div className="user-pc-content">
        <section className="user-pc-profile-panel">
          <div className="user-pc-profile-card">
            <span className="user-pc-avatar-lg" aria-hidden>
              {displayInitial}
            </span>
            <h2>{displayName}</h2>
            <p className="user-pc-role">{user?.roleName || portalLabel}</p>
            <span className="user-pc-portal-badge">{portalLabel}</span>
            <div className="user-pc-shield" aria-hidden>
              <IconShield />
            </div>
          </div>

          <div className="user-pc-side-actions">
            <button
              type="button"
              className="user-pc-logout-btn"
              disabled={loggingOut}
              onClick={logout}
            >
              {loggingOut ? '退出中…' : '退出登录'}
            </button>
            <p className="user-pc-logout-hint">退出后将清除本机登录状态并返回登录页</p>
          </div>
        </section>

        <section className="user-pc-detail-panel">
          <div className="user-pc-section-head">
            <h2>账号信息</h2>
            <p>登录会话与身份绑定信息</p>
          </div>

          <dl className="user-pc-info-grid">
            {infoRows.map((row) => (
              <div key={row.label} className="user-pc-info-row">
                <dt>{row.label}</dt>
                <dd>{row.value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <div className="user-pc-tips-card">
            <h3>安全提示</h3>
            <ul>
              <li>请勿在公共设备上保持登录状态</li>
              <li>若账号异常，请联系 IT 支持（内线 8000）</li>
            </ul>
          </div>
        </section>
      </div>
    </UserPcLayout>
  )
}
