import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ANNOUNCEMENTS } from '../data'
import {
  HealthIllustration,
  IconChevronDown,
  IconChevronRight,
  IconMessage,
  IconSettings,
  IconSparkles,
  IconUser,
  ServiceIcon,
  StatIcon,
} from '../icons'
import { formatTime, getStatusLabel } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import MobileTabbar from '../MobileTabbar'
import './index.css'

export default function PatientHomeMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, myRegistrations, myCharges, patientPendingRegs, pendingCount } = useHomeData(
    PORTAL.PATIENT,
    user,
  )

  const displayName = user?.realName || user?.username || '用户'

  const stats = [
    { label: '我的挂号', value: loading ? '…' : myRegistrations.length, theme: 'blue' },
    { label: '待就诊', value: loading ? '…' : patientPendingRegs.length, theme: 'green' },
    { label: '待缴费', value: loading ? '…' : myCharges.length, theme: 'orange' },
    { label: '提醒', value: loading ? '…' : pendingCount, theme: 'purple' },
  ]

  const quickActions = [
    { id: 'registration', title: '预约挂号', path: '/registration', icon: 'calendar-plus' },
    { id: 'department', title: '科室查询', path: '/department', icon: 'building' },
    { id: 'payment', title: '门诊缴费', path: '/payment', icon: 'wallet' },
    { id: 'health', title: '健康档案', path: '/user', icon: 'folder' },
  ]

  return (
    <div className="home-page home-page--patient">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-greeting">
            <span className="home-portal-tag home-portal-tag--patient">患者端</span>
            <h1 className="home-greeting-title">{formatTime()}好，{displayName}</h1>
            <p className="home-greeting-sub">以下是您的就诊服务</p>
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
        <button type="button" className="home-patient-picker" onClick={() => navigate('/user')}>
          <span className="home-patient-avatar"><IconUser /></span>
          <span className="home-patient-name">{displayName}</span>
          <IconChevronDown />
        </button>
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
            <h2 className="home-section-title">我的待办</h2>
          </div>
          <div className="home-card">
            <div className="home-pending-item" onClick={() => navigate('/registration')}>
              <span className="home-record-icon home-record-icon--blue"><StatIcon theme="blue" /></span>
              <span className="home-record-body">
                <span className="home-record-title">待就诊</span>
                <span className="home-record-meta">{patientPendingRegs.length} 个挂号待就诊</span>
              </span>
              <span className="home-record-status home-record-status--pending">
                {patientPendingRegs.length}
                <IconChevronRight />
              </span>
            </div>
            <div className="home-pending-item home-record-item--border" onClick={() => navigate('/payment')}>
              <span className="home-record-icon home-record-icon--orange"><StatIcon theme="orange" /></span>
              <span className="home-record-body">
                <span className="home-record-title">待缴费</span>
                <span className="home-record-meta">{myCharges.length} 笔费用待支付</span>
              </span>
              <span className="home-record-status home-record-status--pay">
                {myCharges.length}
                <IconChevronRight />
              </span>
            </div>
          </div>
        </section>

        {myRegistrations.length > 0 && (
          <section className="home-section">
            <div className="home-section-head">
              <h2 className="home-section-title">最近挂号</h2>
            </div>
            <div className="home-card">
              {myRegistrations.slice(0, 4).map((item) => (
                <div
                  key={item.id ?? item.registrationId}
                  className="home-record-item home-record-item--border"
                  onClick={() => navigate('/registration')}
                >
                  <span className="home-record-body">
                    <span className="home-record-title">{item.deptName || '门诊挂号'}</span>
                    <span className="home-record-meta">
                      {item.scheduleDate || item.createTime || '—'}
                    </span>
                  </span>
                  <span className="home-record-status home-record-status--pending">
                    {getStatusLabel(item)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="home-section">
          <h2 className="home-section-title">快捷服务</h2>
          <div className="home-card home-services">
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
              <h2 className="home-tip-title">健康小贴士</h2>
              <p className="home-tip-text">
                规律作息、适量运动，有助于提升免疫力。夏季注意防暑补水，如有不适请及时就医。
              </p>
              <button type="button" className="home-tip-btn">了解更多</button>
            </div>
            <HealthIllustration />
          </div>
          {ANNOUNCEMENTS.length > 0 && (
            <div className="home-card" style={{ marginTop: 16 }}>
              {ANNOUNCEMENTS.map((item) => (
                <div key={item.id} className="home-record-item home-record-item--border">
                  <span className="home-record-body">
                    <span className="home-record-title" style={{ fontSize: 14 }}>{item.title}</span>
                    <span className="home-record-meta">{item.date}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <MobileTabbar portal={PORTAL.PATIENT} />
    </div>
  )
}
