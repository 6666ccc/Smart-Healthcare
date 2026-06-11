import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store'
import './index.css'

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  )
}

function IconLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="M12 4v16M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2.2-1.8 4-4 4s-4-1.8-4-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, loading } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }

    try {
      await login(username.trim(), password)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message || '登录失败，请稍后重试')
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-card">
          <header className="login-brand">
            <div className="login-logo" aria-hidden>
              <IconLogo />
            </div>
            <h1 className="login-title">慧疗</h1>
            <p className="login-subtitle">智慧医疗健康管理平台</p>
          </header>

          <div className="login-divider" aria-hidden />

          <form className="login-form" onSubmit={handleLogin}>
            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="input-group">
              <span className="input-icon">
                <IconUser />
              </span>
              <input
                type="text"
                autoComplete="username"
                placeholder="用户名（演示：admin）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <span className="input-icon">
                <IconLock />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="密码（演示：password）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '登录中…' : '登 录'}
            </button>
          </form>

          <div className="login-links">
            <span>忘记密码</span>
            <span onClick={() => navigate('/registration')}>注册账号</span>
          </div>

          <p className="login-demo-hint">
            演示：admin / doctor01 / patient01，密码均为 password
          </p>
        </div>

        <p className="login-footer">安全登录 · 守护您的健康数据</p>
      </div>
    </div>
  )
}
