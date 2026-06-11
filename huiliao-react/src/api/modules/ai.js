import request from '../request'

// —— AI 对话 /api/ai ——

/**
 * POST /api/ai/chat — 发送消息给 AI 并获取回复
 * @param {{ message: string }} data — 用户消息（必填）
 * @param {import('axios').AxiosRequestConfig} [config] — 可选 axios 配置（如 signal 取消请求）
 * @returns {Promise<{ reply: string }>} ChatResponseVO
 */
export function chat(data, config) {
  return request.post('/api/ai/chat', data, {
    timeout: 60000,
    ...config,
  })
}
