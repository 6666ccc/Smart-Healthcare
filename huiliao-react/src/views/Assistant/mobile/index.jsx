import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ChatComposer, ChatEmpty, ChatMessages } from '../ChatView'
import { MODEL_NAME } from '../data'
import { IconBack, IconMenu, IconPlus, IconTrash } from '../icons'
import { useChat } from '../useChat'
import './index.css'

export default function AssistantMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const displayName = user?.realName || user?.username || '用户'

  const {
    sessions,
    activeSession,
    activeId,
    input,
    setInput,
    loading,
    newChat,
    selectSession,
    deleteSession,
    sendMessage,
    messagesEndRef,
  } = useChat()

  const messages = activeSession?.messages ?? []
  const isEmpty = messages.length === 0 && !loading

  const handleNewChat = () => {
    newChat()
    setDrawerOpen(false)
  }

  const handleSelect = (id) => {
    selectSession(id)
    setDrawerOpen(false)
  }

  return (
    <div className="ai-app ai-app--mobile">
      <header className="ai-mobile-header">
        <button type="button" aria-label="打开对话列表" onClick={() => setDrawerOpen(true)}>
          <IconMenu />
        </button>
        <h1 className="ai-mobile-title">{MODEL_NAME}</h1>
        <button type="button" className="ai-mobile-new" aria-label="新对话" onClick={handleNewChat}>
          <IconPlus />
        </button>
      </header>

      {drawerOpen && (
        <>
          <div className="ai-drawer-overlay" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="ai-drawer" aria-label="对话历史">
            <div className="ai-sidebar-top">
              <button type="button" className="ai-sidebar-brand" onClick={() => navigate('/home')}>
                <IconBack />
                <span>返回工作台</span>
              </button>
              <button type="button" className="ai-new-chat" onClick={handleNewChat}>
                <IconPlus />
                <span>新对话</span>
              </button>
            </div>
            <div className="ai-history">
              <div className="ai-history-label">历史记录</div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`ai-history-item${session.id === activeId ? ' ai-history-item--active' : ''}`}
                >
                  <button
                    type="button"
                    className="ai-history-select"
                    onClick={() => handleSelect(session.id)}
                  >
                    {session.title}
                  </button>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      className="ai-history-delete"
                      aria-label="删除对话"
                      onClick={() => deleteSession(session.id)}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="ai-sidebar-footer">
              <button type="button" className="ai-sidebar-user" onClick={() => navigate('/user')}>
                <span className="ai-sidebar-user-avatar">{displayName.charAt(0)}</span>
                <span>{displayName}</span>
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="ai-chat-scroll">
        <div className="ai-chat-inner">
          {isEmpty ? (
            <ChatEmpty userName={displayName} onPickPrompt={(text) => sendMessage(text)} />
          ) : (
            <ChatMessages messages={messages} loading={loading} messagesEndRef={messagesEndRef} />
          )}
        </div>
      </div>

      <ChatComposer
        input={input}
        setInput={setInput}
        loading={loading}
        onSend={() => sendMessage()}
        compact
      />
    </div>
  )
}
