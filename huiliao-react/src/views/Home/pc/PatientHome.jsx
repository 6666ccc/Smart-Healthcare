import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ANNOUNCEMENTS, QUICK_ACTIONS_BY_PORTAL } from '../data'
import { IconChevronRight, ServiceIcon, ShieldIllustration, StatIcon } from '../icons'
import { formatMoney, getStatusLabel } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import PcLayout from './PcLayout'

export default function PatientHomePc() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, myRegistrations, myCharges, patientPendingRegs, pendingCount } = useHomeData(
    PORTAL.PATIENT,
    user,
  )

  const quickActions = QUICK_ACTIONS_BY_PORTAL[PORTAL.PATIENT]

  return (
    <PcLayout
      portal={PORTAL.PATIENT}
      pendingCount={pendingCount}
      greetingSub={loading ? '数据加载中…' : '以下是您的就诊服务'}
      searchPlaceholder="搜索科室、医生"
    >
      <section className="home-pc-todos anim-stagger anim-visible">
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--blue"><StatIcon theme="blue" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : myRegistrations.length}</h3>
            <p>我的挂号</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--green"><StatIcon theme="green" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : patientPendingRegs.length}</h3>
            <p>待就诊</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--orange"><StatIcon theme="orange" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : myCharges.length}</h3>
            <p>待缴费</p>
          </div>
        </article>
      </section>

      <section className="home-pc-section">
        <h2 className="home-pc-section-title">快捷服务</h2>
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
            <h2 className="home-pc-section-title">我的待办</h2>
          </div>
          <div className="home-pc-records">
            {patientPendingRegs.length === 0 && myCharges.length === 0 && !loading && (
              <div className="home-pc-pending-empty">暂无待办，祝您健康</div>
            )}
            {patientPendingRegs.slice(0, 5).map((item) => (
              <button
                key={item.id ?? item.registrationId}
                type="button"
                className="home-pc-record-item home-pc-record-item--border"
                onClick={() => navigate('/registration')}
              >
                <span className="home-pc-record-icon home-pc-record-icon--blue">
                  <StatIcon theme="blue" />
                </span>
                <span className="home-pc-record-body">
                  <strong>{item.deptName || '门诊挂号'}</strong>
                  <span>{item.scheduleDate || item.createTime || '—'}</span>
                </span>
                <span className="home-pc-record-status home-pc-record-status--pending">
                  {getStatusLabel(item)}
                  <IconChevronRight />
                </span>
              </button>
            ))}
            {myCharges.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className="home-pc-record-item home-pc-record-item--border"
                onClick={() => navigate('/payment')}
              >
                <span className="home-pc-record-icon home-pc-record-icon--orange">
                  <StatIcon theme="orange" />
                </span>
                <span className="home-pc-record-body">
                  <strong>门诊缴费</strong>
                  <span>{item.totalAmount != null ? formatMoney(item.totalAmount) : '—'}</span>
                </span>
                <span className="home-pc-record-status home-pc-record-status--pay">
                  待支付 <IconChevronRight />
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="home-pc-side">
          <section className="home-pc-tip-card">
            <div className="home-pc-section-head">
              <h2 className="home-pc-section-title">健康小贴士</h2>
            </div>
            <p>
              规律作息、适量运动，有助于提升免疫力。夏季注意防暑补水，如有不适请及时就医。
            </p>
            <ShieldIllustration />
          </section>

          <section className="home-pc-announce-card">
            <div className="home-pc-section-head">
              <h2 className="home-pc-section-title">医院公告</h2>
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
