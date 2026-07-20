import { useAuth } from '../../store'
import { useAssistant } from './useAssistant'
import { AssistantHeader, ChatComposer, ContextSummary, ConversationHistory, ConversationThread, TaskSheet } from './components'
import '../shared/views.css'

export default function Assistant() {
  const { user } = useAuth()
  const assistant = useAssistant(user)
  return <div className="agent-shell">
    <div className="agent-shell__grain" />
    <ConversationHistory sessions={assistant.sessions} activeId={assistant.activeId} onSelect={assistant.selectSession} onNewChat={assistant.newChat} onDelete={assistant.deleteSession} user={user} />
    <main className="agent-main"><AssistantHeader onNewChat={assistant.newChat} /><ConversationThread session={assistant.activeSession} replying={assistant.replying} streaming={assistant.streaming} onSend={assistant.sendMessage} onOpenTask={assistant.openTask} user={user} /><ChatComposer disabled={assistant.replying} onSend={assistant.sendMessage} onStop={assistant.stopReply} /></main>
    <ContextSummary context={assistant.context} onOpenTask={assistant.openTask} onRetry={assistant.refreshContext} />
    <TaskSheet task={assistant.task} context={assistant.context} onClose={assistant.closeTask} onSubmitRegistration={assistant.submitRegistration} />
  </div>
}
