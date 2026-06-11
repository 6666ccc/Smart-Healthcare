import { useCallback, useEffect, useRef, useState } from 'react'
import { chat as chatApi } from '../../api'

const STORAGE_KEY = 'huiliao_ai_sessions'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createSession(title = '新对话') {
  return {
    id: uid(),
    title,
    messages: [],
    updatedAt: Date.now(),
  }
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

function titleFromMessage(text) {
  const t = text.trim().slice(0, 18)
  return t.length < text.trim().length ? `${t}…` : t || '新对话'
}

export function useChat() {
  const [sessions, setSessions] = useState(() => {
    const loaded = loadSessions()
    return loaded ?? [createSession()]
  })
  const [activeId, setActiveId] = useState(() => {
    const loaded = loadSessions()
    const list = loaded ?? [createSession()]
    return list[0]?.id ?? null
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  // 同步 loading 到 ref，避免闭包陷阱：切换会话时 loading 状态不会阻塞新会话
  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0]

  useEffect(() => {
    if (!activeId && sessions[0]) setActiveId(sessions[0].id)
  }, [activeId, sessions])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, loading])

  useEffect(() => () => abortRef.current?.abort(), [])

  const newChat = useCallback(() => {
    const session = createSession()
    setSessions((prev) => [session, ...prev])
    setActiveId(session.id)
    setInput('')
  }, [])

  const selectSession = useCallback((id) => {
    setActiveId(id)
    setInput('')
  }, [])

  const deleteSession = useCallback(
    (id) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id)
        if (next.length === 0) {
          const fresh = createSession()
          setActiveId(fresh.id)
          return [fresh]
        }
        if (activeId === id) setActiveId(next[0].id)
        return next
      })
    },
    [activeId],
  )

  const sendMessage = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || loadingRef.current || !activeSession) return

      const userMsg = { id: uid(), role: 'user', content, createdAt: Date.now() }
      const sessionId = activeSession.id
      const isFirst = activeSession.messages.length === 0

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          return {
            ...s,
            title: isFirst ? titleFromMessage(content) : s.title,
            messages: [...s.messages, userMsg],
            updatedAt: Date.now(),
          }
        }),
      )
      setInput('')
      setLoading(true)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      let reply
      let skipReply = false
      try {
        const data = await chatApi({ message: content }, { signal: controller.signal })
        reply = data?.reply?.trim() || '抱歉，未能获取有效回复，请稍后重试。'
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') {
          skipReply = true
        } else {
          reply = err?.message || 'AI 服务暂时不可用，请稍后重试。'
        }
      }

      setLoading(false)
      if (skipReply) return

      const assistantMsg = {
        id: uid(),
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
      }

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          return {
            ...s,
            messages: [...s.messages, assistantMsg],
            updatedAt: Date.now(),
          }
        }),
      )
    },
    [activeSession, input],
  )

  return {
    sessions,
    activeSession,
    activeId: activeSession?.id,
    input,
    setInput,
    loading,
    newChat,
    selectSession,
    deleteSession,
    sendMessage,
    messagesEndRef,
  }
}
