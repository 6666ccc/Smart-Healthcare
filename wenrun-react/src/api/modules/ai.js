import request from '../request'

/**
 * AI 对话（非流式）：调用 Java {@code POST /api/ai/java/chat}，走 LangGraph 路由图。
 * @param {{ message: string, conversationId?: string }} payload
 * @returns {Promise<string>} AI 回复文本
 */
export async function chat(payload) {
  const { message, conversationId } =
    typeof payload === 'string' ? { message: payload } : payload

  const data = await request.post(
    '/api/ai/java/chat',
    {
      content: message,
      sessionId: conversationId,
    },
    { timeout: 120_000 },
  )

  return data?.final_output || data?.reply || ''
}
