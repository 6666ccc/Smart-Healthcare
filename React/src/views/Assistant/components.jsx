import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { listSchedules } from '../../api'
import { writeMode, MODE_CLASSIC } from '../../features/experience/mode'
import { IconAI, IconCalendar, IconLogo, IconRecord, IconWallet } from '../shared'

const SUGGESTIONS = ['最近总是睡不好，帮我判断该挂什么科', '查看我最近的预约', '我有待缴费用吗？', '如何查看就诊记录？']
const URGENT_PATTERN = /胸痛|呼吸困难|意识障碍|大量出血/

function formatMoney(value) {
  return `¥${Number(value || 0).toFixed(2)}`
}

export function AssistantHeader({ onNewChat }) {
  const navigate = useNavigate()
  const switchClassic = () => {
    writeMode(MODE_CLASSIC)
    navigate('/home')
  }

  return <header className="agent-header">
    <div className="agent-header__brand"><span><IconLogo size={18} /></span><div><strong>温润 · 随身诊室</strong><small><i />智能体在线</small></div></div>
    <div className="agent-header__actions"><button type="button" onClick={onNewChat}>新对话</button><button type="button" onClick={switchClassic}>传统版</button></div>
  </header>
}

export function ConversationHistory({ sessions, activeId, onSelect, onNewChat, onDelete, user }) {
  return <aside className="agent-history" aria-label="问诊历史">
    <div className="agent-history__brand"><span><IconLogo size={23} /></span><div><strong>温润诊所</strong><small>WARM CLINIC · AI CARE</small></div></div>
    <button type="button" className="agent-history__new" onClick={onNewChat}>＋ 开始新的问诊</button>
    <p className="agent-history__title">最近对话</p>
    <div className="agent-history__list">
      {sessions.map((session) => <div key={session.id} className={`agent-history__item${session.id === activeId ? ' is-active' : ''}`}>
        <button type="button" onClick={() => onSelect(session.id)}><strong>{session.title}</strong><small>{session.messages.length ? `${session.messages.length} 条消息` : '尚未开始'}</small></button>
        {sessions.length > 1 && <button type="button" aria-label={`删除${session.title}`} onClick={() => onDelete(session.id)}>×</button>}
      </div>)}
    </div>
    <div className="agent-history__user"><b>{(user?.realName || user?.username || '患')[0]}</b><span><strong>{user?.realName || user?.username || '患者'}</strong><small>患者端 · 数据已加密</small></span></div>
  </aside>
}

function Message({ message }) {
  const isUser = message.role === 'user'
  return <article className={`agent-message agent-message--${isUser ? 'user' : 'assistant'}`}>
    {!isUser && <span className="agent-message__avatar"><IconAI size={16} /></span>}
    <div>{isUser ? <p>{message.content}</p> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}</div>
  </article>
}

export function ConversationThread({ session, replying, streaming, onSend, onOpenTask, user }) {
  const endRef = useRef(null)
  const messages = session?.messages || []
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const urgent = latestUserMessage && URGENT_PATTERN.test(latestUserMessage.content)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, replying])

  if (!messages.length) {
    const name = user?.realName || user?.username || '朋友'
    return <div className="agent-welcome">
      <div className="agent-welcome__orb"><IconLogo size={40} /></div>
      <p>早上好，{name}</p>
      <h1>把身体的困扰，<em>慢慢告诉我。</em></h1>
      <span>我可以帮你分诊、预约、查看就诊信息和解释账单。重要决定仍由你确认，并交给医生判断。</span>
      <div className="agent-welcome__suggestions">{SUGGESTIONS.map((item) => <button key={item} type="button" onClick={() => onSend(item)}>{item}<b>→</b></button>)}</div>
      <div className="agent-welcome__actions">
        <button type="button" onClick={() => onOpenTask({ type: 'registration', title: '预约挂号' })}><IconCalendar size={19} /><span><strong>预约挂号</strong><small>选择科室和时间</small></span><b>→</b></button>
        <button type="button" onClick={() => onOpenTask({ type: 'payment', title: '待缴费用' })}><IconWallet size={19} /><span><strong>查看费用</strong><small>核对待缴账单</small></span><b>→</b></button>
        <button type="button" onClick={() => onOpenTask({ type: 'records', title: '就诊记录' })}><IconRecord size={19} /><span><strong>就诊记录</strong><small>回顾你的诊疗信息</small></span><b>→</b></button>
      </div>
    </div>
  }

  return <div className="agent-thread">
    {urgent && <div className="agent-alert"><strong>出现急症风险提示</strong><span>如有胸痛、呼吸困难、意识障碍或大量出血，请立即拨打 120 或前往急诊。</span></div>}
    {messages.map((message, index) => <Message key={`${message.role}-${index}`} message={message} />)}
    {replying && !streaming && <div className="agent-typing"><span /><span /><span />正在整理信息…</div>}
    <div ref={endRef} />
  </div>
}

export function ContextSummary({ context, onOpenTask, onRetry }) {
  const nextAppointment = context.appointments[0]
  const total = context.charges.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  const cards = [
    { key: 'appointments', label: '下一次就诊', title: nextAppointment ? `${nextAppointment.deptName || '门诊'} · ${nextAppointment.staffName || '待确认'}` : '还没有预约', text: nextAppointment ? `${nextAppointment.workDate || '时间待定'} · ${nextAppointment.timePeriod || ''}` : '需要时告诉我，我来协助安排。', task: { type: 'registration', title: '预约挂号' } },
    { key: 'charges', label: '待缴费用', title: context.charges.length ? formatMoney(total) : '暂无待缴账单', text: context.charges.length ? `${context.charges.length} 笔账单等待处理` : '所有费用状态会在这里同步。', task: { type: 'payment', title: '待缴费用' } },
    { key: 'visits', label: '最近就诊', title: context.visits.length ? `${context.visits.length} 条记录` : '暂无就诊记录', text: context.visits.length ? '查看过往就诊和检查信息。' : '完成就诊后会自动出现。', task: { type: 'records', title: '就诊记录' } },
  ]
  return <aside className="agent-context" aria-label="就诊摘要">
    <div className="agent-context__intro"><p>就诊上下文</p><h2>把需要处理的事，<br />放在我身边。</h2><span><i />数据实时同步</span></div>
    {cards.map((card) => <section key={card.key} className={`agent-context__card${context.errors[card.key] ? ' is-error' : ''}`}>
      <small>{card.label}</small>
      {context.loading ? <b className="agent-context__skeleton" /> : <><strong>{context.errors[card.key] ? '暂时无法加载' : card.title}</strong><p>{context.errors[card.key] ? '请检查网络后重试。' : card.text}</p></>}
      <button type="button" onClick={() => context.errors[card.key] ? onRetry() : onOpenTask(card.task)}>{context.errors[card.key] ? '重新加载' : '查看详情'} →</button>
    </section>)}
  </aside>
}

export function ChatComposer({ disabled, onSend, onStop }) {
  const [input, setInput] = useState('')
  const submit = () => {
    if (!input.trim() || disabled) return
    onSend(input)
    setInput('')
  }
  return <footer className="agent-composer"><div><textarea value={input} rows={1} disabled={disabled} placeholder="描述症状，或告诉我想办理什么…" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }} />{disabled ? <button type="button" className="agent-composer__stop" onClick={onStop}>停止</button> : <button type="button" onClick={submit} disabled={!input.trim()}>↑</button>}</div><p>AI 提供健康信息和就医协助，不替代医生诊断；如遇急症请立即拨打 120。</p></footer>
}

function RegistrationTask({ onClose, onComplete }) {
  const [schedules, setSchedules] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listSchedules({ workDate: new Date().toISOString().slice(0, 10) })
      .then((list) => { if (active) setSchedules(Array.isArray(list) ? list.filter((item) => item.remainingCount > 0) : []) })
      .catch(() => { if (active) setError('暂时无法获取可预约的排班。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const submit = async () => {
    if (!selected) return
    setSaving(true)
    setError('')
    try { await onComplete(selected.id); onClose() } catch (nextError) { setError(nextError.message || '挂号失败，请稍后重试。') } finally { setSaving(false) }
  }

  return <><p>选择可预约的排班，最终提交前由你确认。</p>{loading ? <div className="agent-task__loading">正在查询可预约排班…</div> : <div className="agent-task__options">{schedules.length ? schedules.map((schedule) => <button type="button" key={schedule.id} className={selected?.id === schedule.id ? 'is-selected' : ''} onClick={() => setSelected(schedule)}><strong>{schedule.deptName} · {schedule.staffName}</strong><span>{schedule.workDate} · {schedule.timePeriod} · 余号 {schedule.remainingCount}</span><b>¥{schedule.registerFee}</b></button>) : <div className="agent-task__empty">今天暂无可预约排班，请稍后重试或切换传统版查询。</div>}</div>}{error && <div className="agent-task__error">{error}</div>}<button type="button" className="agent-task__submit" disabled={!selected || saving} onClick={submit}>{saving ? '正在提交…' : '确认挂号'}</button></>
}

function PaymentTask({ charges, onClose }) {
  const navigate = useNavigate()
  return <><p>确认账单后将在安全支付页继续办理。</p><div className="agent-task__options">{charges.length ? charges.map((charge) => <button type="button" key={charge.id} onClick={() => { onClose(); navigate(`/payment/${charge.id}`) }}><strong>{charge.orderNo || '门诊费用'}</strong><span>{charge.createTime || '待缴费'}</span><b>{formatMoney(charge.totalAmount)}</b></button>) : <div className="agent-task__empty">目前没有待缴账单。</div>}</div></>
}

function RecordsTask({ onClose }) {
  const navigate = useNavigate()
  return <><p>就诊记录保留在传统服务中，便于完整查看。</p><div className="agent-task__empty">你可以查看历史挂号、就诊信息和个人档案。</div><button type="button" className="agent-task__submit" onClick={() => { onClose(); navigate('/registration') }}>查看就诊记录</button></>
}

export function TaskSheet({ task, context, onClose, onSubmitRegistration }) {
  if (!task) return null
  const title = task.title || ({ registration: '预约挂号', payment: '待缴费用', records: '就诊记录' }[task.type])
  return <div className="agent-task-overlay" role="presentation" onMouseDown={onClose}><section className="agent-task" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="agent-task__handle" /><button type="button" className="agent-task__close" onClick={onClose} aria-label="关闭任务面板">×</button><small>{task.type === 'registration' ? '预约挂号' : task.type === 'payment' ? '费用服务' : '健康档案'}</small><h2>{title}</h2>{task.type === 'registration' && <RegistrationTask onClose={onClose} onComplete={onSubmitRegistration} />}{task.type === 'payment' && <PaymentTask charges={context.charges} onClose={onClose} />}{task.type === 'records' && <RecordsTask onClose={onClose} />}</section></div>
}
