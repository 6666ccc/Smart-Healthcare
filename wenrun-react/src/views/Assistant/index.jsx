import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useIsPc } from '../../hooks'
import { chatStream } from '../../api'
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

function ChatMessage({ message, showAvatar, streaming }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8,
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
function AssistantMobile({ sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming }) {
  const [input, setInput] = useState('')
  const chatEndRef = useRef(null)
  const active = sessions.find(s => s.id === activeId)
  const messages = active?.messages || []

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
            {messages.map((m, i) => (
              <ChatMessage
                key={i}
                message={m}
                showAvatar={false}
                streaming={replying && streaming && i === messages.length - 1 && m.role === 'assistant'}
              />
            ))}
            {replying && !streaming && <TypingIndicator showAvatar={false} />}
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
function AssistantPc({ sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming }) {
  const [input, setInput] = useState('')
  const chatEndRef = useRef(null)
  const active = sessions.find(s => s.id === activeId)
  const messages = active?.messages || []

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
                {messages.map((m, i) => (
                  <ChatMessage
                    key={i}
                    message={m}
                    showAvatar
                    streaming={replying && streaming && i === messages.length - 1 && m.role === 'assistant'}
                  />
                ))}
                {replying && !streaming && <TypingIndicator showAvatar />}
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
function useChat() {
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem('huiliao_ai_sessions')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return [{ id: 'default', title: '新对话', messages: [] }]
  })
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || 'default')
  const [replying, setReplying] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('huiliao_ai_sessions', JSON.stringify(sessions))
  }, [sessions])

  const sendMessage = async (text) => {
    let currentId = activeId
    if (!sessions.find(s => s.id === currentId)) {
      currentId = sessions[0]?.id
    }

    const controller = new AbortController()
    abortRef.current = controller

    const userMsg = { role: 'user', content: text }
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
    setStreaming(false)

    try {
      await chatStream(
        { message: text, conversationId: currentId },
        {
          signal: controller.signal,
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
      const errMsg = { role: 'assistant', content: `抱歉，请求出错：${e.message}` }
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== currentId) return s
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant' && !last.content) {
            msgs[msgs.length - 1] = errMsg
          } else {
            msgs.push(errMsg)
          }
          return { ...s, messages: msgs }
        })
      )
    } finally {
      setReplying(false)
      setStreaming(false)
      abortRef.current = null
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

  return { sessions, activeId, sendMessage, newChat, selectSession, deleteSession, replying, streaming }
}

export default function Assistant() {
  const isPc = useIsPc()
  const chat = useChat()

  if (isPc) return <AssistantPc {...chat} />
  return <AssistantMobile {...chat} />
}
