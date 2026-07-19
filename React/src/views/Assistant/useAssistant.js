import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chatStream, listCharges, listRegistrations } from '../../api'
import { listVisits } from '../../api/modules/consultation'
import { createRegistration } from '../../api/modules/registration'
import { taskFromChatEvent } from '../../api/modules/ai'
import { createSession, normalizeSessions } from '../../features/assistant/session'
import { toTask } from '../../features/assistant/task'

const SESSION_STORAGE_KEY = 'wenrun_ai_sessions'

function makeId() {
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function valueOrEmpty(result) {
  return result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
}

export function useAssistant(user) {
  const [sessions, setSessions] = useState(() => normalizeSessions(localStorage.getItem(SESSION_STORAGE_KEY)))
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || 'default')
  const [context, setContext] = useState({ appointments: [], charges: [], visits: [], loading: true, errors: {} })
  const [replying, setReplying] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [task, setTask] = useState(null)
  const abortRef = useRef(null)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0],
    [activeId, sessions],
  )

  const updateSession = useCallback((id, updater) => {
    setSessions((previous) => previous.map((session) => (session.id === id ? updater(session) : session)))
  }, [])

  const refreshContext = useCallback(async () => {
    if (!user?.userId && !user?.patientId) {
      setContext({ appointments: [], charges: [], visits: [], loading: false, errors: {} })
      return
    }
    setContext((previous) => ({ ...previous, loading: true, errors: {} }))
    const [appointments, charges, visits] = await Promise.allSettled([
      listRegistrations({ userId: user?.userId }),
      listCharges({ patientId: user?.patientId }),
      listVisits({ patientId: user?.patientId }),
    ])
    setContext({
      appointments: valueOrEmpty(appointments),
      charges: valueOrEmpty(charges).filter((item) => item.payStatus === 0),
      visits: valueOrEmpty(visits),
      loading: false,
      errors: {
        appointments: appointments.status === 'rejected',
        charges: charges.status === 'rejected',
        visits: visits.status === 'rejected',
      },
    })
  }, [user?.patientId, user?.userId])

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    void refreshContext()
  }, [refreshContext])

  const newChat = useCallback(() => {
    const next = createSession(makeId())
    setSessions((previous) => [...previous, next])
    setActiveId(next.id)
  }, [])

  const deleteSession = useCallback((id) => {
    setSessions((previous) => {
      if (previous.length <= 1) return previous
      const next = previous.filter((session) => session.id !== id)
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }, [activeId])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || replying || !activeSession) return
    const conversationId = activeSession.id
    const content = text.trim()
    updateSession(conversationId, (session) => ({
      ...session,
      title: session.messages.length ? session.title : content.slice(0, 18),
      messages: [...session.messages, { role: 'user', content }],
    }))
    const controller = new AbortController()
    abortRef.current = controller
    setReplying(true)
    setStreaming(false)
    try {
      await chatStream({ message: content, conversationId }, {
        signal: controller.signal,
        onEvent: (event) => {
          const nextTask = taskFromChatEvent(event)
          if (nextTask) setTask(nextTask)
        },
        onToken: (chunk) => {
          setStreaming(true)
          updateSession(conversationId, (session) => {
            const messages = [...session.messages]
            const last = messages.at(-1)
            if (last?.role === 'assistant') messages[messages.length - 1] = { ...last, content: last.content + chunk }
            else messages.push({ role: 'assistant', content: chunk })
            return { ...session, messages }
          })
        },
        onDone: (reply) => updateSession(conversationId, (session) => {
          const messages = [...session.messages]
          const last = messages.at(-1)
          if (last?.role === 'assistant') messages[messages.length - 1] = { ...last, content: reply || last.content }
          else if (reply) messages.push({ role: 'assistant', content: reply })
          return { ...session, messages }
        }),
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        updateSession(conversationId, (session) => ({
          ...session,
          messages: [...session.messages, { role: 'assistant', content: `暂时没有连接上医院智能体。${error.message || '请稍后重试。'}` }],
        }))
      }
    } finally {
      setReplying(false)
      setStreaming(false)
      abortRef.current = null
    }
  }, [activeSession, replying, updateSession])

  const stopReply = useCallback(() => abortRef.current?.abort(), [])
  const openTask = useCallback((candidate) => setTask(toTask(candidate)), [])
  const closeTask = useCallback(() => setTask(null), [])
  const submitRegistration = useCallback(async (scheduleId) => {
    if (!user?.patientId || !scheduleId) throw new Error('请选择可预约的排班')
    await createRegistration({ patientId: user.patientId, scheduleId })
    await refreshContext()
  }, [refreshContext, user?.patientId])

  return {
    sessions,
    activeId,
    activeSession,
    context,
    replying,
    streaming,
    task,
    sendMessage,
    stopReply,
    newChat,
    deleteSession,
    selectSession: setActiveId,
    refreshContext,
    openTask,
    closeTask,
    submitRegistration,
  }
}
