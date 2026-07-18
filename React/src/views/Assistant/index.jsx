import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatStream, listCharges, listRegistrations } from '../../api'
import { listVisits } from '../../api/modules/consultation'
import { useAuth } from '../../store'
import { IconAI, IconCalendar, IconLogo, IconRecord, IconWallet } from '../shared'
import '../shared/views.css'

const SUGGESTIONS = ['我最近总是睡不好，先帮我判断应该挂什么科', '帮我看看最近有没有待缴费', '我想预约下周的内科', '如何查看我的检查报告？']
const ACTIONS = [
  { id: 'book_appointment', label: '预约挂号', hint: '告诉我症状和想去的时间', icon: IconCalendar, tone: 'teal' },
  { id: 'view_appointments', label: '我的预约', hint: '查看即将到来的就诊', icon: IconRecord, tone: 'navy' },
  { id: 'view_payment', label: '待缴费用', hint: '快速打开待支付账单', icon: IconWallet, tone: 'amber' },
]

function makeId() { return `session_${Date.now()}_${Math.random().toString(16).slice(2)}` }

function usePatientContext() {
  const { user } = useAuth()
  const [context, setContext] = useState({ appointments: [], charges: [], visits: [], loading: true })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [appointments, charges, visits] = await Promise.allSettled([
        listRegistrations({ userId: user?.userId }),
        listCharges({ patientId: user?.patientId }),
        listVisits({ patientId: user?.patientId }),
      ])
      if (!mounted) return
      setContext({
        appointments: appointments.status === 'fulfilled' && Array.isArray(appointments.value) ? appointments.value : [],
        charges: charges.status === 'fulfilled' && Array.isArray(charges.value) ? charges.value.filter((item) => item.payStatus === 0) : [],
        visits: visits.status === 'fulfilled' && Array.isArray(visits.value) ? visits.value : [],
        loading: false,
      })
    }
    load()
    return () => { mounted = false }
  }, [user?.patientId, user?.userId])

  return context
}

function useChat() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wenrun_ai_sessions') || 'null')
      if (Array.isArray(saved) && saved.length) return saved
    } catch { /* ignore broken local state */ }
    return [{ id: 'default', title: '新的问诊', messages: [] }]
  })
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || 'default')
  const [replying, setReplying] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('wenrun_ai_sessions', JSON.stringify(sessions))
    return undefined
  }, [sessions])

  const updateSession = (id, updater) => setSessions((previous) => previous.map((session) => session.id === id ? updater(session) : session))

  const sendMessage = async (text) => {
    if (!text.trim() || replying) return
    const conversationId = activeId
    const userMessage = { role: 'user', content: text.trim() }
    updateSession(conversationId, (session) => ({
      ...session,
      title: session.messages.length ? session.title : text.trim().slice(0, 18),
      messages: [...session.messages, userMessage],
    }))
    const controller = new AbortController()
    abortRef.current = controller
    setReplying(true)
    setStreaming(false)
    try {
      await chatStream({ message: text.trim(), conversationId }, {
        signal: controller.signal,
        onToken: (chunk) => {
          setStreaming(true)
          updateSession(conversationId, (session) => {
            const messages = [...session.messages]
            const last = messages[messages.length - 1]
            if (last?.role === 'assistant') messages[messages.length - 1] = { ...last, content: last.content + chunk }
            else messages.push({ role: 'assistant', content: chunk })
            return { ...session, messages }
          })
        },
        onDone: (reply) => updateSession(conversationId, (session) => {
          const messages = [...session.messages]
          const last = messages[messages.length - 1]
          if (last?.role === 'assistant') messages[messages.length - 1] = { ...last, content: reply || last.content }
          else if (reply) messages.push({ role: 'assistant', content: reply })
          return { ...session, messages }
        }),
      })
    } catch (error) {
      if (error.name !== 'AbortError') updateSession(conversationId, (session) => ({ ...session, messages: [...session.messages, { role: 'assistant', content: `暂时没有连接上医院智能体。${error.message || '请稍后重试。'}` }] }))
    } finally {
      setReplying(false)
      setStreaming(false)
      abortRef.current = null
    }
  }

  return {
    sessions, activeId, replying, streaming, sendMessage,
    newChat: () => { const id = makeId(); setSessions((previous) => [...previous, { id, title: '新的问诊', messages: [] }]); setActiveId(id) },
    selectSession: setActiveId,
    deleteSession: (id) => setSessions((previous) => previous.length <= 1 ? previous : previous.filter((session) => session.id !== id)),
  }
}

function ContextRail({ context, onNavigate }) {
  const next = context.appointments[0]
  const total = context.charges.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
  return <aside className="ai-context">
    <div className="ai-context__eyebrow">就诊上下文</div>
    <h2>今天的你，<br />值得被好好照顾。</h2>
    <div className="ai-context__status"><span />智能体在线 · 患者端</div>
    <section className="ai-context-card">
      <div className="ai-context-card__label">下一次就诊</div>
      {next ? <><strong>{next.deptName || '门诊'}</strong><p>{next.workDate || '待确认'} · {next.timePeriod || '时间待定'}</p><button onClick={() => onNavigate('/registration')}>查看预约 →</button></> : <><strong>还没有预约</strong><p>告诉我想看的科室，我来帮你安排。</p><button onClick={() => onNavigate('/registration')}>去预约 →</button></>}
    </section>
    <section className="ai-context-card ai-context-card--amber">
      <div className="ai-context-card__label">待缴费用</div><strong>¥{total.toFixed(2)}</strong><p>{context.charges.length ? `${context.charges.length} 笔账单待处理` : '目前没有待缴账单'}</p><button onClick={() => onNavigate('/payment')}>打开账单 →</button>
    </section>
    <section className="ai-context-note"><span>✦</span><p>我会记住你在这次对话里说过的内容，但不会替你做任何需要医生判断的决定。</p></section>
  </aside>
}

function ActionCard({ action, onClick }) {
  const Icon = action.icon
  return <button className={`ai-action ai-action--${action.tone}`} onClick={onClick}><span className="ai-action__icon"><Icon size={20} /></span><span><strong>{action.label}</strong><small>{action.hint}</small></span><b>↗</b></button>
}

function Message({ message }) {
  const user = message.role === 'user'
  return <div className={`ai-message ai-message--${user ? 'user' : 'assistant'}`}>
    {!user && <div className="ai-message__avatar"><IconLogo size={17} /></div>}
    <div className="ai-message__body">{user ? <p>{message.content}</p> : <div className="ai-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>}</div>
  </div>
}

function ConversationPanel({ chat, user, onNavigate }) {
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  const active = chat.sessions.find((session) => session.id === chat.activeId)
  const messages = active?.messages || []
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
    return undefined
  }, [messages.length, chat.replying])
  const submit = () => { if (!input.trim() || chat.replying) return; chat.sendMessage(input); setInput('') }
  const name = user?.realName || user?.username || '朋友'
  return <main className="ai-conversation">
    <header className="ai-conversation__header"><div className="ai-presence"><span className="ai-presence__mark"><IconAI size={18} /></span><div><strong>温润 · 医院智能体</strong><small>患者专属健康与就诊助手</small></div></div><button className="ai-new-chat" onClick={chat.newChat}>＋ 新对话</button></header>
    <div className="ai-thread">
      {!messages.length ? <div className="ai-welcome"><div className="ai-welcome__orb"><IconLogo size={42} /></div><p className="ai-welcome__kicker">早上好，{name}</p><h1>你可以把身体的困惑，<br /><em>慢慢告诉我。</em></h1><p className="ai-welcome__copy">我能帮你分诊、预约、查看就诊信息和解释报告。每一步都会由你确认，重要决定交给医生。</p><div className="ai-suggestions">{SUGGESTIONS.map((item) => <button key={item} onClick={() => chat.sendMessage(item)}>{item}<span>↗</span></button>)}</div><div className="ai-action-grid">{ACTIONS.map((action) => <ActionCard key={action.id} action={action} onClick={() => onNavigate(action.id === 'view_payment' ? '/payment' : action.id === 'view_appointments' ? '/registration' : '/registration')} />)}</div></div> : <div className="ai-messages">{messages.map((message, index) => <Message key={`${message.role}-${index}`} message={message} />)}{chat.replying && !chat.streaming && <div className="ai-typing"><span /><span /><span /> 智能体正在整理信息…</div>}<div ref={endRef} /></div>}
    </div>
    <footer className="ai-composer"><div className="ai-composer__box"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="描述你的症状，或告诉我你想办理什么…" rows={1} disabled={chat.replying} /><button onClick={submit} disabled={!input.trim() || chat.replying}>{chat.replying ? '…' : '发送 ↗'}</button></div><p>AI 提供健康信息和就诊协助，不替代医生诊断；如遇急症请立即拨打 120 或前往急诊。</p></footer>
  </main>
}

export default function Assistant() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const context = usePatientContext()
  const chat = useChat()
  const [showHistory, setShowHistory] = useState(false)
  const sessions = useMemo(() => chat.sessions.filter((session) => session.messages.length || session.id === chat.activeId), [chat.sessions, chat.activeId])
  return <div className="ai-shell"><div className="ai-shell__grain" /><aside className="ai-sidebar"><div className="ai-brand"><div className="ai-brand__logo"><IconLogo size={25} /></div><div><strong>温润诊所</strong><small>WARM CLINIC · AI CARE</small></div></div><div className="ai-sidebar__intro"><span>患者端</span><p>一个懂你的医院，<br />从一次对话开始。</p></div><button className="ai-sidebar__new" onClick={chat.newChat}>＋ 开始新的问诊</button><div className="ai-history"><div className="ai-history__title">最近对话 <button onClick={() => setShowHistory((value) => !value)}>{showHistory ? '收起' : '查看全部'}</button></div>{(showHistory ? sessions : sessions.slice(-4)).map((session) => <button key={session.id} className={`ai-history__item${session.id === chat.activeId ? ' is-active' : ''}`} onClick={() => chat.selectSession(session.id)}><span /><strong>{session.title || '新的问诊'}</strong><small>{session.messages.length ? `${session.messages.length} 条消息` : '尚未开始'}</small></button>)}</div><div className="ai-sidebar__footer"><span className="ai-sidebar__avatar">{(user?.realName || user?.username || '患')[0]}</span><div><strong>{user?.realName || user?.username || '患者'}</strong><small>你的健康档案已加密</small></div></div></aside><ConversationPanel chat={chat} user={user} onNavigate={navigate} /><ContextRail context={context} onNavigate={navigate} /><button className="ai-mobile-context" onClick={() => setShowHistory((value) => !value)}>就诊摘要 · {context.charges.length ? `${context.charges.length} 笔待缴费` : '暂无待办'} <span>↑</span></button></div>
}
