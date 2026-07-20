import request from '../request'

/**
 * AI 对话（非流式）：调用 Java POST /api/ai/java/chat，走 LangGraph 路由图。
 * @param {{ message: string, conversationId?: string }} payload
 * @returns {Promise<object>} 完整响应
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
