import request from '../request'

/**
 * AI 对话（非流式）：调用 Java POST /api/ai/java/chat，走 LangGraph 路由图。
 * @param {{ message: string, conversationId?: string }} payload
 * @returns {Promise<object>} 完整响应（含 HITL 字段）
 */
export async function chat(payload) {
  const { message, conversationId } =
    typeof payload === 'string' ? { message: payload } : payload

  return request.post(
    '/api/ai/java/chat',
    {
      content: message,
      sessionId: conversationId,
    },
    { timeout: 120_000 },
  )
}

/**
 * [HITL] 恢复被中断的 Agent 执行（用户确认 / 拒绝 / 追加信息后调用）。
 * @param {{ sessionId: string, decisions: Array<{ type: string, message?: string }> }} payload
 * @returns {Promise<object>}
 */
export async function chatResume(payload) {
  return request.post(
    '/api/ai/java/chat/resume',
    payload,
    { timeout: 120_000 },
  )
}
