import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useIsPc } from '../../hooks'
import { chatStream, resumeChat } from '../../api'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader, IconLogo } from '../shared'
import '../shared/views.css'

const SUGGESTIONS = [
  '感冒了应该注意什么？',
  '如何预防高血压？',
  '儿童发烧多少度需要就医？',
  '中医如何看待失眠？',
  '常见的药物相互作用有哪些？',
  '体检报告怎么看肝功能指标？',
]
const EMPTY_MESSAGES = []

function ChatWelcome({ onSuggest, isPc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: isPc ? '40px 20px' : '32px 16px',
      gap: 14, flex: isPc ? 1 : undefined,
      animation: 'fadeUp var(--dur-slow) var(--ease-enter) both',
    }}>
      <div style={{
        width: isPc ? 80 : 64, height: isPc ? 80 : 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, #c8944a, #d4a85f)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(200, 148, 74, 0.35)',
      }}>
        <IconLogo size={isPc ? 36 : 28} />
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: isPc ? '1.4rem' : '1.1rem', fontWeight: 600 }}>
        AI 健康助手
      </div>
      <p className="text-sub text-sm" style={{ textAlign: 'center', maxWidth: isPc ? 360 : 280, lineHeight: 1.7 }}>
        您可以向我咨询健康问题。本助手仅供科普参考，不构成医疗诊断。
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: isPc ? 500 : 320, marginTop: 4 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chat-suggestion" onClick={() => onSuggest(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function HitlConfirmationCard({ interrupt, onDecision }) {
  const [editing, setEditing] = useState(false)
  const [argsText, setArgsText] = useState(() => JSON.stringify(interrupt.args || {}, null, 2))
  const [rejecting, setRejecting] = useState(false)
  const [rejectMessage, setRejectMessage] = useState('')
  const [validationError, setValidationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const decisions = interrupt.allowedDecisions || []

  const decide = async (decision) => {
    if (submitting) return
    if (decision === 'reject' && !rejectMessage.trim()) {
      setRejecting(true)
      setValidationError('\u8bf7\u8f93\u5165\u62d2\u7edd\u539f\u56e0')
      return
    }
    let args
    if (decision === 'edit') {
      try {
        args = JSON.parse(argsText)
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('object required')
      } catch {
        setValidationError('请输入有效的 JSON 参数。')
        return
      }
    }
    setValidationError('')
    setSubmitting(true)
    try {
      await onDecision(interrupt, decision, args, rejectMessage.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ border: '1px solid var(--c-accent)', borderRadius: 10, padding: 12, background: 'rgba(200, 148, 74, 0.08)', minWidth: 250 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{interrupt.title || '需要您的确认'}</div>
      {(interrupt.summary || interrupt.details) && <p className="text-sub text-sm" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{interrupt.summary || interrupt.details}</p>}
      {interrupt.args && <pre style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{JSON.stringify(interrupt.args, null, 2)}</pre>}
      {editing && <textarea className="input" value={argsText} onChange={(e) => { setArgsText(e.target.value); setValidationError('') }} rows={5} style={{ width: '100%', marginBottom: 8, resize: 'vertical' }} />}
      {validationError && <p style={{ color: 'var(--c-danger)', margin: '0 0 8px', fontSize: '0.8rem' }}>{validationError}</p>}
      {rejecting && <textarea className="input" value={rejectMessage} onChange={(e) => { setRejectMessage(e.target.value); setValidationError('') }} rows={3} placeholder="\u8bf7\u8f93\u5165\u62d2\u7edd\u539f\u56e0" style={{ width: '100%', marginBottom: 8, resize: 'vertical' }} />}
      {interrupt.processed ? <span className="text-muted text-sm">已处理</span> : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {decisions.includes('approve') && <button type="button" className="btn btn--accent btn--sm" onClick={() => decide('approve')}>确认</button>}
          {decisions.includes('reject') && <button type="button" className="btn btn--outline btn--sm" onClick={() => decide('reject')}>拒绝</button>}
          {decisions.includes('edit') && (!editing ? <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing(true)}>修改参数</button> : <button type="button" className="btn btn--outline btn--sm" onClick={() => decide('edit')}>提交修改</button>)}
        </div>
      )}
    </section>
  )
}

function ChatMessage({ message, showAvatar, streaming, onInterruptDecision }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8,
        alignSelf: 'flex-end', maxWidth: '80%',
      }}>
        <div className="chat-bubble chat-bubble--user">{message.content}</div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 8, width: '100%',
    }}>
      {!isUser && showAvatar && <div className="chat-avatar"><IconLogo size={16} /></div>}
      <div className={`chat-bubble chat-bubble--${message.role}`}>
        {isUser ? (
          message.content
        ) : (
          <div className="chat-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.interrupt && <HitlConfirmationCard interrupt={message.interrupt} onDecision={onInterruptDecision} />}
        {!isUser && streaming && <span className="chat-stream-cursor">▍</span>}
      </div>
    </div>
  )
}

function TypingIndicator({ showAvatar }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      {showAvatar && <div className="chat-avatar"><IconLogo size={16} /></div>}
      <div style={{ display: 'flex', gap: 4, padding: '10px 16px' }}>
        {[0, 0.2, 0.4].map((delay) => (
          <span key={delay} style={{
            animation: 'dotBounce 1.4s infinite both', animationDelay: `${delay}s`,
            width: 7, height: 7, borderRadius: '50%', background: 'var(--c-muted)',
          }} />
        ))}
      </div>
    </div>
  )
}

/* ==================== 移动端 ==================== */
function AssistantMobile({ sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming, handleInterruptDecision }) {
  const [input, setInput] = useState('')
  const chatEndRef = useRef(null)
  const active = sessions.find(s => s.id === activeId)
  const messages = active?.messages ?? EMPTY_MESSAGES

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, replying])

  const handleSend = () => {
    if (!input.trim() || replying) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}>
      <PageHeader
        title="AI 健康助手"
        subtitle="智能问诊咨询（仅供健康参考）"
        action={<button className="btn btn--outline btn--sm" onClick={newChat}>+ 新对话</button>}
      />

      {sessions.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 8px 0', flexShrink: 0 }}>
          {sessions.map((s) => (
            <button key={s.id} type="button" onClick={() => selectSession(s.id)}
              className={`chat-suggestion${s.id === activeId ? '' : ''}`}
              style={{
                borderColor: s.id === activeId ? 'var(--c-accent)' : undefined,
                background: s.id === activeId ? 'rgba(200, 148, 74, 0.08)' : undefined,
                color: s.id === activeId ? 'var(--c-accent)' : undefined,
              }}
            >
              {s.title || '新对话'}
              {sessions.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  style={{ marginLeft: 6, opacity: 0.5 }}>×</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.length === 0 ? (
          <ChatWelcome onSuggest={sendMessage} isPc={false} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                showAvatar={false}
                streaming={replying && streaming && i === messages.length - 1 && m.role === 'assistant'}
                onInterruptDecision={handleInterruptDecision}
              />
            ))}
            {replying && <TypingIndicator showAvatar={false} />}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入健康问题…"
            rows={1}
            style={{ resize: 'none', minHeight: 44 }}
            disabled={replying}
          />
          <button className="btn btn--accent" onClick={handleSend}
            disabled={!input.trim() || replying}
            style={{ flexShrink: 0, height: 44 }}>
            {replying ? '…' : '发送'}
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: 6 }}>
          AI 助手仅供健康科普参考，不构成医疗诊断。如有不适请及时就医。
        </p>
      </div>

      <MobileTabbar />
    </div>
  )
}

/* ==================== PC 端 ==================== */
function AssistantPc({ sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming, handleInterruptDecision }) {
  const [input, setInput] = useState('')
  const chatEndRef = useRef(null)
  const active = sessions.find(s => s.id === activeId)
  const messages = active?.messages ?? EMPTY_MESSAGES

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, replying])

  const handleSend = () => {
    if (!input.trim() || replying) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <PcLayout>
      <div className="assistant-pc" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>


        <div style={{
          display: 'flex', flex: 1, minHeight: 0,
          gap: 0, background: 'var(--c-card)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--c-border-light)', overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
        }}>
        <div style={{
          width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--c-border-light)', padding: 16,
          background: 'rgba(250, 246, 240, 0.4)',
        }}>
          <button className="btn btn--accent btn--sm" onClick={newChat} style={{ marginBottom: 12 }}>
            + 新对话
          </button>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sessions.map((s) => (
              <div key={s.id} onClick={() => selectSession(s.id)}
                className={`pc-nav-link${s.id === activeId ? ' pc-nav-link--active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {s.title || '新对话'}
                </span>
                {sessions.length > 1 && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                    style={{ border: 'none', background: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontSize: '1rem' }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {messages.length === 0 ? (
            <ChatWelcome onSuggest={sendMessage} isPc />
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720, margin: '0 auto' }}>
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    showAvatar
                    streaming={replying && streaming && i === messages.length - 1 && m.role === 'assistant'}
                    onInterruptDecision={handleInterruptDecision}
                  />
                ))}
                {replying && <TypingIndicator showAvatar />}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border-light)', background: 'var(--c-card)' }}>
            <div style={{ display: 'flex', gap: 8, maxWidth: 720, margin: '0 auto' }}>
              <textarea
                className="input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入健康问题… (Enter 发送，Shift+Enter 换行)"
                rows={2}
                style={{ resize: 'none' }}
                disabled={replying}
              />
              <button className="btn btn--accent" onClick={handleSend}
                disabled={!input.trim() || replying}
                style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
                {replying ? '回复中…' : '发送'}
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: 8 }}>
              AI 助手仅供健康科普参考，不构成医疗诊断。如有不适请及时就医。
            </p>
          </div>
        </div>
      </div>
      </div>
    </PcLayout>
  )
}

/* ========== Chat Hook ========== */
let _msgSeq = 0
function nextMsgId() {
  _msgSeq += 1
  return `msg_${Date.now()}_${_msgSeq}`
}

function normalizeSessions(raw) {
  if (!Array.isArray(raw)) return [{ id: 'default', title: '新对话', messages: [] }]
  return raw.map((session) => ({
    ...session,
    messages: (session.messages || []).map((m, i) =>
      m.id ? m : { ...m, id: `legacy_${session.id}_${i}` }
    ),
  }))
}

function buildAssistantMessage(data) {
  return {
    id: nextMsgId(),
    role: 'assistant',
    content: data?.final_output || data?.reply || '抱歉，暂时无法回复。',
  }
}

function useChat() {
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem('wenrun_ai_sessions')
      if (raw) {
        const parsed = normalizeSessions(JSON.parse(raw))
        if (parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return [{ id: 'default', title: '新对话', messages: [] }]
  })
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || 'default')
  const [replying, setReplying] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('wenrun_ai_sessions', JSON.stringify(sessions))
  }, [sessions])

  const sendMessage = async (text) => {
    let currentId = activeId
    if (!sessions.find(s => s.id === currentId)) {
      currentId = sessions[0]?.id
    }

    const controller = new AbortController()
    abortRef.current = controller

    const userMsg = { id: nextMsgId(), role: 'user', content: text }
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === currentId ? { ...s, messages: [...s.messages, userMsg] } : s
      )
      return updated.map(s => {
        if (s.id === currentId && !s.title && s.messages.length === 1) {
          return { ...s, title: text.slice(0, 18) + (text.length > 18 ? '…' : '') }
        }
        return s
      })
    })

    setReplying(true)

    try {
      const data = await chat(
        { message: text, conversationId: currentId },
        {
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type !== 'interrupt') return
            const interrupts = Array.isArray(event.interrupts) ? event.interrupts : []
            setSessions(prev => prev.map(s => {
              if (s.id !== currentId) return s
              const pendingMessages = interrupts.map((interrupt, index) => ({
                role: 'assistant',
                content: '',
                interrupt: {
                  ...interrupt,
                  id: interrupt.id || `${currentId}-${Date.now()}-${index}`,
                  conversationId: event.conversationId || currentId,
                },
              }))
              return { ...s, messages: [...s.messages, ...pendingMessages] }
            }))
          },
          onToken: (chunk) => {
            setStreaming(true)
            setSessions(prev =>
              prev.map(s => {
                if (s.id !== currentId) return s
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last?.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
                } else {
                  msgs.push({ role: 'assistant', content: chunk })
                }
                return { ...s, messages: msgs }
              })
            )
          },
          onDone: (reply) => {
            setSessions(prev =>
              prev.map(s => {
                if (s.id !== currentId) return s
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                if (last?.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...last, content: reply || last.content || '抱歉，暂时无法回复。' }
                } else {
                  msgs.push({ role: 'assistant', content: reply || '抱歉，暂时无法回复。' })
                }
                return { ...s, messages: msgs }
              })
            )
          },
        },
      )
    } catch (e) {
      if (e.name === 'AbortError') return
      const errMsg = { id: nextMsgId(), role: 'assistant', content: `抱歉，请求出错：${e.message}` }
      setSessions(prev =>
        prev.map(s =>
          s.id === currentId ? { ...s, messages: [...s.messages, errMsg] } : s
        )
      )
    } finally {
      setReplying(false)
      abortRef.current = null
    }
  }

  const handleInterruptDecision = async (interrupt, decision, args, message) => {
    const conversationId = interrupt.conversationId || activeId
    setSessions(prev => prev.map(s => {
      if (s.id !== conversationId) return s
      return {
        ...s,
        messages: s.messages.map(message => message.interrupt?.id === interrupt.id
          ? { ...message, interrupt: { ...message.interrupt, processed: true } }
          : message),
      }
    }))

    try {
      const payload = { decision }
      if (decision === 'edit') payload.args = args
      if (decision === 'reject') payload.message = message
      const result = await resumeChat({ conversationId, decision: payload })
      const resultConversationId = result.conversationId || conversationId
      setSessions(prev => prev.map(s => {
        if (s.id !== resultConversationId) return s
        const messages = [...s.messages]
        if (result.reply) messages.push({ role: 'assistant', content: result.reply })
        for (const [index, nextInterrupt] of (result.interrupts || []).entries()) {
          messages.push({
            role: 'assistant',
            content: '',
            interrupt: {
              ...nextInterrupt,
              id: nextInterrupt.id || `${resultConversationId}-${Date.now()}-${index}`,
              conversationId: resultConversationId,
            },
          })
        }
        return { ...s, messages }
      }))
    } catch (e) {
      setSessions(prev => prev.map(s => {
        if (s.id !== conversationId) return s
        return {
          ...s,
          messages: s.messages.map(item => item.interrupt?.id === interrupt.id
            ? { ...item, interrupt: { ...item.interrupt, processed: false } }
            : item),
        }
      }))
      setSessions(prev => prev.map(s => s.id === conversationId
        ? { ...s, messages: [...s.messages, { role: 'assistant', content: `恢复操作失败：${e.message}` }] }
        : s))
    }
  }

  const newChat = () => {
    const id = `session_${Date.now()}`
    setSessions(prev => [...prev, { id, title: '', messages: [] }])
    setActiveId(id)
  }

  const selectSession = (id) => setActiveId(id)

  const deleteSession = (id) => {
    setSessions(prev => {
      if (prev.length <= 1) return prev
      const filtered = prev.filter(s => s.id !== id)
      if (activeId === id) setActiveId(filtered[0]?.id)
      return filtered
    })
  }

  return { sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming, handleInterruptDecision }
}

export default function Assistant() {
  const isPc = useIsPc()
  const chat = useChat()

  if (isPc) return <AssistantPc {...chat} />
  return <AssistantMobile {...chat} />
}
