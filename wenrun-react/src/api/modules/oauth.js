/**
 * OAuth 2.0 refresh_token 请求（不走 axios 拦截器，避免循环）
 */
const CLIENT_ID = 'huiliao-web'

export async function fetchTokenByRefresh(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  })

  const res = await fetch('/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error_description || '刷新登录失败')
  }

  return res.json()
}
