import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ANNOUNCEMENTS } from '../data'
import {
  HealthIllustration,
  IconChevronRight,
  IconMessage,
  IconSettings,
  IconSparkles,
  ServiceIcon,
  StatIcon,
} from '../icons'
import { formatTime, getStatusLabel } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import MobileTabbar from '../MobileTabbar'
import './index.css'

export default function DoctorHomeMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, dashboard, pendingRegs, myVisits, pendingCount } = useHomeData(PORTAL.DOCTOR, user)

  const displayName = user?.realName || user?.username || '医生'

  const stats = [
    { label: '待诊', value: loading ? '…' : pendingRegs.length, theme: 'blue' },
    { label: '接诊中', value: loading ? '…' : myVisits.length, theme: 'green' },
    { label: '今日接诊', value: loading ? '…' : (dashboard?.todayVisits ?? '—'), theme: 'orange' },
    { label: '待办', value: loading ? '…' : pendingCount, theme: 'purple' },
  ]

  const quickActions = [
    { id: 'consultation', title: '开始接诊', path: '/consultation', icon: 'stethoscope' },
    { id: 'registration', title: '排班', path: '/registration', icon: 'calendar-plus' },
    { id: 'report', title: '报告', path: '/consultation', icon: 'report' },
  ]

  return (
    <div className="home-page home-page--doctor">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-greeting">
            <span className="home-portal-tag home-portal-tag--doctor">医生端</span>
            <h1 className="home-greeting-title">{formatTime()}好，{displayName} 医生</h1>
            <p className="home-greeting-sub">以下是您的门诊工作台</p>
          </div>
          <div className="home-header-actions">
            <button type="button" className="home-icon-btn" aria-label="消息">
              <IconMessage />
              {pendingCount > 0 && (
                <span className="home-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </button>
            <button type="button" className="home-icon-btn" aria-label="AI 助手" onClick={() => navigate('/assistant')}>
              <IconSparkles />
            </button>
            <button type="button" className="home-icon-btn" aria-label="设置" onClick={() => navigate('/user')}>
              <IconSettings />
            </button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <section className="home-section">
          <div className="home-stats-row">
            {stats.map((s) => (
              <div key={s.theme} className={`home-stat-card home-stat-card--${s.theme}`}>
                <span className="home-stat-value">{s.value}</span>
                <span className="home-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-section-title">待诊患者</h2>
            <button type="button" className="home-section-link" onClick={() => navigate('/consultation')}>
              全部 <IconChevronRight />
            </button>
          </div>
          <div className="home-card">
            {pendingRegs.length === 0 && !loading && (
              <p className="home-empty-tip">当前暂无待诊患者</p>
            )}
            {pendingRegs.slice(0, 6).map((item) => (
              <div
                key={item.id ?? item.registrationId}
                className="home-pending-item home-record-item--border"
                onClick={() => navigate('/consultation')}
              >
                <span className="home-record-icon home-record-icon--blue"><StatIcon theme="blue" /></span>
                <span className="home-record-body">
                  <span className="home-record-title">{item.patientName || `患者 #${item.patientId}`}</span>
                  <span className="home-record-meta">
                    {item.deptName || '—'}
                    {item.scheduleDate ? ` · ${item.scheduleDate}` : ''}
                  </span>
                </span>
                <span className="home-record-status home-record-status--pending">
                  {getStatusLabel(item)}
                  <IconChevronRight />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <h2 className="home-section-title">快捷功能</h2>
          <div className="home-card home-services home-services--compact">
            {quickActions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="home-service-item"
                onClick={() => navigate(item.path)}
              >
                <span className={`home-service-icon home-service-icon--${item.id}`}>
                  <ServiceIcon name={item.icon} />
                </span>
                <span className="home-service-title">{item.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-section home-section--last">
          <div className="home-tip-banner">
            <div className="home-tip-content">
              <h2 className="home-tip-title">接诊提示</h2>
              <p className="home-tip-text">请按叫号顺序接诊，完成接诊后及时录入诊断与处方。</p>
            </div>
            <HealthIllustration />
          </div>
          {ANNOUNCEMENTS.slice(0, 2).map((item) => (
            <div key={item.id} className="home-card" style={{ marginTop: 12 }}>
              <div className="home-record-item">
                <span className="home-record-body">
                  <span className="home-record-title" style={{ fontSize: 14 }}>{item.title}</span>
                  <span className="home-record-meta">{item.date}</span>
                </span>
              </div>
            </div>
          ))}
        </section>
      </main>

      <MobileTabbar portal={PORTAL.DOCTOR} />
    </div>
  )
}
