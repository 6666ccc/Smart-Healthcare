import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { QUICK_ACTIONS_BY_PORTAL } from '../data'
import { IconChevronRight, ServiceIcon, StatIcon } from '../icons'
import { getStatusLabel } from '../utils'
import { useHomeData } from '../useHomeData'
import { PORTAL } from '../role'
import PcLayout from './PcLayout'

export default function DoctorHomePc() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading, dashboard, pendingRegs, myVisits, pendingCount } = useHomeData(PORTAL.DOCTOR, user)

  const quickActions = QUICK_ACTIONS_BY_PORTAL[PORTAL.DOCTOR]

  return (
    <PcLayout
      portal={PORTAL.DOCTOR}
      pendingCount={pendingCount}
      greetingSub={loading ? '数据加载中…' : '以下是您的门诊工作台'}
      searchPlaceholder="搜索患者、挂号单"
    >
      <section className="home-pc-todos">
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--blue"><StatIcon theme="blue" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : pendingRegs.length}</h3>
            <p>待诊患者</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--green"><StatIcon theme="green" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : myVisits.length}</h3>
            <p>接诊中</p>
          </div>
        </article>
        <article className="home-pc-todo-card">
          <span className="home-pc-todo-icon home-pc-todo-icon--orange"><StatIcon theme="orange" /></span>
          <div className="home-pc-todo-body">
            <h3>{loading ? '…' : (dashboard?.todayVisits ?? '—')}</h3>
            <p>今日接诊</p>
          </div>
        </article>
      </section>

      <section className="home-pc-section">
        <h2 className="home-pc-section-title">快捷功能</h2>
        <div className="home-pc-services home-pc-services--doctor">
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

      <section className="home-pc-section home-pc-records-wrap">
        <div className="home-pc-section-head">
          <h2 className="home-pc-section-title">待诊列表</h2>
          <button type="button" className="home-pc-section-link" onClick={() => navigate('/consultation')}>
            进入接诊 <IconChevronRight />
          </button>
        </div>
        <div className="home-pc-records">
          {pendingRegs.length === 0 && !loading && (
            <div className="home-pc-pending-empty">当前暂无待诊患者</div>
          )}
          {pendingRegs.slice(0, 10).map((item) => (
            <button
              key={item.id ?? item.registrationId}
              type="button"
              className="home-pc-record-item home-pc-record-item--border"
              onClick={() => navigate('/consultation')}
            >
              <span className="home-pc-record-icon home-pc-record-icon--blue">
                <StatIcon theme="blue" />
              </span>
              <span className="home-pc-record-body">
                <strong>{item.patientName || `患者 #${item.patientId}`}</strong>
                <span>
                  {item.deptName || '—'}
                  {item.scheduleDate ? ` · ${item.scheduleDate}` : ''}
                </span>
              </span>
              <span className="home-pc-record-status home-pc-record-status--pending">
                {getStatusLabel(item)}
                <IconChevronRight />
              </span>
            </button>
          ))}
        </div>
      </section>
    </PcLayout>
  )
}
