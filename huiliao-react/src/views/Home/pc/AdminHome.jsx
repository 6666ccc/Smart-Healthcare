import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ANNOUNCEMENTS, QUICK_ACTIONS_BY_PORTAL } from '../data'
import {
  IconChevronRight,
  ServiceIcon,
  ShieldIllustration,
  StatIcon,
} from '../icons'
import { formatMoney, getStatusLabel } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import PcLayout from './PcLayout'

export default function AdminHomePc() {
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

  const quickActions = QUICK_ACTIONS_BY_PORTAL[PORTAL.ADMIN]

  const stats = {
    registrations: dashboard?.todayRegistrations ?? pendingRegs.length,
    visits: dashboard?.todayVisits ?? '—',
    revenue: dashboard?.todayRevenue,
    pending: pendingCount,
  }

  return (
    <PcLayout
      portal={PORTAL.ADMIN}
      pendingCount={pendingCount}
      lowStockCount={lowStock.length}
      greetingSub={loading ? '数据加载中…' : '以下是今日运营概览'}
    >
      <section className="home-pc-todos anim-stagger anim-visible">
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--blue"><StatIcon theme="blue" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : stats.registrations}</h3>
            <p>今日挂号</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--green"><StatIcon theme="green" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : stats.visits}</h3>
            <p>今日接诊</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--orange"><StatIcon theme="orange" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : formatMoney(stats.revenue)}</h3>
            <p>今日收费</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--purple"><StatIcon theme="purple" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : pendingCount}</h3>
            <p>待办事项</p>
          </div>
        </article>
      </section>

      <section className="home-pc-section">
        <h2 className="home-pc-section-title">快捷功能</h2>
        <div className="home-pc-services anim-stagger anim-visible">
          {quickActions.map((item) => (
            <button
              key={item.id}
              type="button"
              className="home-pc-service-card"
              onClick={() => navigate(item.path)}
            >
              <span className={`home-pc-service-icon home-pc-service-icon--${item.id}`}>
                <ServiceIcon name={item.icon} />
              </span>
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="home-pc-bottom">
        <section className="home-pc-section home-pc-records-wrap">
          <div className="home-pc-section-head">
            <h2 className="home-pc-section-title">待办任务</h2>
          </div>
          <div className="home-pc-records">
            <PendingGroup
              title="待诊患者"
              count={pendingRegs.length}
              emptyText="暂无须就诊患者"
              loading={loading}
              items={pendingRegs}
              path="/registration"
              theme="blue"
              renderTitle={(item) => item.patientName || `患者 #${item.patientId}`}
              renderMeta={(item) => `${item.deptName || '—'} · ${item.scheduleDate || ''}`}
              statusLabel={getStatusLabel}
            />
            <PendingGroup
              title="待收费"
              count={pendingCharges.length}
              emptyText="暂无待收费项目"
              loading={loading}
              items={pendingCharges}
              path="/payment"
              theme="green"
              renderTitle={(item) => item.patientName || `收费单 #${item.id}`}
              renderMeta={(item) => (item.totalAmount ? `¥${Number(item.totalAmount).toFixed(2)}` : '—')}
              statusLabel={() => '待支付'}
            />
            <PendingGroup
              title="待发药"
              count={pendingPrescriptions.length}
              emptyText="暂无待发药处方"
              loading={loading}
              items={pendingPrescriptions}
              path="/payment"
              theme="orange"
              renderTitle={(item) => item.patientName || `处方 #${item.id}`}
              renderMeta={(item) => item.drugNames || '—'}
              statusLabel={() => '待发药'}
            />
          </div>
        </section>

        <div className="home-pc-side">
          {lowStock.length > 0 && (
            <section className="home-pc-announce-card home-pc-alert-card">
              <div className="home-pc-section-head">
                <h2 className="home-pc-section-title">库存预警</h2>
              </div>
              <ul className="home-pc-announce-list">
                {lowStock.slice(0, 5).map((item) => (
                  <li key={item.drugId ?? item.id}>
                    <button type="button">
                      {item.drugName || `药品 #${item.drugId}`}
                      {item.stock != null && (
                        <span className="home-pc-lowstock-num">（库存：{item.stock}）</span>
                      )}
                    </button>
                    <span className="home-pc-lowstock-badge">不足</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="home-pc-tip-card">
            <div className="home-pc-section-head">
              <h2 className="home-pc-section-title">运营提示</h2>
            </div>
            <p>请关注待收费与库存预警，保障门诊闭环顺畅运转。</p>
            <ShieldIllustration />
          </section>

          <section className="home-pc-announce-card">
            <div className="home-pc-section-head">
              <h2 className="home-pc-section-title">医院公告</h2>
              <button type="button" className="home-pc-section-link">
                更多 <IconChevronRight />
              </button>
            </div>
            <ul className="home-pc-announce-list">
              {ANNOUNCEMENTS.map((item) => (
                <li key={item.id}>
                  <button type="button">{item.title}</button>
                  <time dateTime={item.date}>{item.date}</time>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </PcLayout>
  )
}

function PendingGroup({
  title,
  count,
  emptyText,
  loading,
  items,
  path,
  theme,
  renderTitle,
  renderMeta,
  statusLabel,
}) {
  const navigate = useNavigate()

  return (
    <div className="home-pc-pending-group">
      <div className="home-pc-pending-header">
        <span>{title}</span>
        <span className="home-pc-pending-count">{count}</span>
      </div>
      {items.length === 0 && !loading && <div className="home-pc-pending-empty">{emptyText}</div>}
      {items.slice(0, 5).map((item) => (
        <button
          key={item.id ?? item.registrationId}
          type="button"
          className="home-pc-record-item home-pc-record-item--border"
          onClick={() => navigate(path)}
        >
          <span className={`home-pc-record-icon home-pc-record-icon--${theme}`}>
            <StatIcon theme={theme} />
          </span>
          <span className="home-pc-record-body">
            <strong>{renderTitle(item)}</strong>
            <span>{renderMeta(item)}</span>
          </span>
          <span className={`home-pc-record-status home-pc-record-status--${theme === 'blue' ? 'pending' : 'pay'}`}>
            {statusLabel(item)}
            <IconChevronRight />
          </span>
        </button>
      ))}
    </div>
  )
}
