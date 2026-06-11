import { MODEL_NAME, STARTER_PROMPTS } from './data'
import { IconBot, IconSend, IconSparkles } from './icons'

function renderMarkdownLite(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function TypingIndicator() {
  return (
    <div className="ai-msg ai-msg--assistant">
      <span className="ai-msg-avatar ai-msg-avatar--bot" aria-hidden>
        <IconBot />
      </span>
      <div className="ai-msg-bubble ai-msg-bubble--typing">
        <span className="ai-typing-dot" />
        <span className="ai-typing-dot" />
        <span className="ai-typing-dot" />
      </div>
    </div>
  )
}

export function ChatEmpty({ onPickPrompt, userName }) {
  return (
    <div className="ai-empty ai-empty--animate">
      <div className="ai-empty-icon" aria-hidden>
        <IconSparkles />
      </div>
      <h2 className="ai-empty-title">你好，{userName}</h2>
      <p className="ai-empty-desc">我是 {MODEL_NAME}，可解答流程、术语与待办相关问题。</p>
      <div className="ai-starters">
        {STARTER_PROMPTS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="ai-starter-chip"
            style={{ '--chip-delay': `${0.32 + index * 0.07}s` }}
            onClick={() => onPickPrompt(item.text)}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChatMessages({ messages, loading, messagesEndRef }) {
  if (messages.length === 0 && !loading) return null

  return (
    <div className="ai-messages">
      {messages.map((msg, index) => (
        <div
          key={msg.id}
          className={`ai-msg ai-msg--${msg.role} ai-msg--enter`}
          style={{ '--msg-delay': `${Math.min(index * 0.05, 0.25)}s` }}
        >
          {msg.role === 'assistant' && (
            <span className="ai-msg-avatar ai-msg-avatar--bot" aria-hidden>
              <IconBot />
            </span>
          )}
          <div className="ai-msg-bubble">
            <div className="ai-msg-content">{renderMarkdownLite(msg.content)}</div>
          </div>
          {msg.role === 'user' && (
            <span className="ai-msg-avatar ai-msg-avatar--user" aria-hidden>
              我
            </span>
          )}
        </div>
      ))}
      {loading && <TypingIndicator />}
      <div ref={messagesEndRef} className="ai-messages-anchor" />
    </div>
  )
}

export function ChatComposer({ input, setInput, loading, onSend, compact }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className={`ai-composer${compact ? ' ai-composer--compact' : ''}`}>
      <div className="ai-composer-box">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="发送消息…"
          disabled={loading}
          aria-label="输入消息"
        />
        <button
          type="button"
          className="ai-send-btn"
          disabled={loading || !input.trim()}
          onClick={() => onSend()}
          aria-label="发送"
        >
          <IconSend />
        </button>
      </div>
      <p className="ai-disclaimer">慧疗 AI 可能会出错，重要医疗决策请咨询专业医护人员。</p>
    </div>
  )
}
