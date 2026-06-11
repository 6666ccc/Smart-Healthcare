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
import { formatMoney, formatTime } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import MobileTabbar from '../MobileTabbar'
import './index.css'

export default function AdminHomeMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    loading,
    dashboard,
    pendingRegs,
    pendingCharges,
    pendingPrescriptions,
    lowStock,
    pendingCount,
  } = useHomeData(PORTAL.ADMIN, user)

  const displayName = user?.realName || user?.username || '用户'

  const stats = [
    { label: '今日挂号', value: loading ? '…' : (dashboard?.todayRegistrations ?? pendingRegs.length), theme: 'blue' },
    { label: '今日接诊', value: loading ? '…' : (dashboard?.todayVisits ?? '—'), theme: 'green' },
    { label: '今日收费', value: loading ? '…' : formatMoney(dashboard?.todayRevenue), theme: 'orange' },
    { label: '待办', value: loading ? '…' : pendingCount, theme: 'purple' },
  ]

  const quickActions = [
    { id: 'registration', title: '挂号', path: '/registration', icon: 'calendar-plus' },
    { id: 'consultation', title: '接诊', path: '/consultation', icon: 'stethoscope' },
    { id: 'payment', title: '收费', path: '/payment', icon: 'wallet' },
    { id: 'dispense', title: '发药', path: '/dispense', icon: 'building' },
  ]

  return (
    <div className="home-page home-page--admin">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-greeting">
            <span className="home-portal-tag">管理端</span>
            <h1 className="home-greeting-title">{formatTime()}好，{displayName}</h1>
            <p className="home-greeting-sub">以下是今日运营概览</p>
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
            <h2 className="home-section-title">待办任务</h2>
          </div>
          <div className="home-card">
            <div className="home-pending-item" onClick={() => navigate('/registration')}>
              <span className="home-record-icon home-record-icon--blue"><StatIcon theme="blue" /></span>
              <span className="home-record-body">
                <span className="home-record-title">待诊患者</span>
                <span className="home-record-meta">{pendingRegs.length} 人等待就诊</span>
              </span>
              <span className="home-record-status home-record-status--pending">
                {pendingRegs.length}
                <IconChevronRight />
              </span>
            </div>
            <div className="home-pending-item home-record-item--border" onClick={() => navigate('/payment')}>
              <span className="home-record-icon home-record-icon--green"><StatIcon theme="green" /></span>
              <span className="home-record-body">
                <span className="home-record-title">待收费</span>
                <span className="home-record-meta">{pendingCharges.length} 笔待支付</span>
              </span>
              <span className="home-record-status home-record-status--pay">
                {pendingCharges.length}
                <IconChevronRight />
              </span>
            </div>
            <div className="home-pending-item home-record-item--border" onClick={() => navigate('/payment')}>
              <span className="home-record-icon home-record-icon--orange"><StatIcon theme="orange" /></span>
              <span className="home-record-body">
                <span className="home-record-title">待发药</span>
                <span className="home-record-meta">{pendingPrescriptions.length} 张处方待发药</span>
              </span>
              <span className="home-record-status home-record-status--pay">
                {pendingPrescriptions.length}
                <IconChevronRight />
              </span>
            </div>
          </div>
        </section>

        <section className="home-section">
          <h2 className="home-section-title">快捷功能</h2>
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

        {lowStock.length > 0 && (
          <section className="home-section">
            <div className="home-section-head">
              <h2 className="home-section-title">库存预警</h2>
            </div>
            <div className="home-card">
              {lowStock.slice(0, 5).map((item) => (
                <div key={item.drugId ?? item.id} className="home-record-item home-record-item--border">
                  <span className="home-record-icon home-record-icon--orange"><StatIcon theme="orange" /></span>
                  <span className="home-record-body">
                    <span className="home-record-title">{item.drugName || `药品 #${item.drugId}`}</span>
                    <span className="home-record-meta">{item.stock != null ? `库存：${item.stock}` : '—'}</span>
                  </span>
                  <span className="home-record-status home-record-status--pay">不足</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="home-section home-section--last">
          <div className="home-tip-banner">
            <div className="home-tip-content">
              <h2 className="home-tip-title">运营提示</h2>
              <p className="home-tip-text">请关注待收费与库存预警，保障门诊流程顺畅运转。</p>
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

      <MobileTabbar portal={PORTAL.ADMIN} />
    </div>
  )
}
