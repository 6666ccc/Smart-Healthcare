import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { ChatComposer, ChatEmpty, ChatMessages } from '../ChatView'
import { MODEL_NAME } from '../data'
import { IconBack, IconPlus, IconSparkles, IconTrash } from '../icons'
import { useChat } from '../useChat'
import './index.css'

export default function AssistantPc() {
  const navigate = useNavigate()
  const { user } = useAuth()
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

  return (
    <div className="ai-app">
      <aside className="ai-sidebar" aria-label="对话历史">
        <div className="ai-sidebar-top">
          <button type="button" className="ai-sidebar-brand" onClick={() => navigate('/home')}>
            <IconBack />
            <span>返回工作台</span>
          </button>
          <button type="button" className="ai-new-chat" onClick={newChat}>
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
                onClick={() => selectSession(session.id)}
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

      <div className="ai-main">
        <header className="ai-topbar">
          <h1 className="ai-topbar-title">
            <IconSparkles />
            {MODEL_NAME}
          </h1>
        </header>

        <div className="ai-chat-scroll">
          <div className="ai-chat-inner">
            {isEmpty ? (
              <ChatEmpty userName={displayName} onPickPrompt={(text) => sendMessage(text)} />
            ) : (
              <ChatMessages messages={messages} loading={loading} messagesEndRef={messagesEndRef} />
            )}
          </div>
        </div>

        <div className="ai-composer">
          <div className="ai-composer-inner">
            <ChatComposer
              input={input}
              setInput={setInput}
              loading={loading}
              onSend={() => sendMessage()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
