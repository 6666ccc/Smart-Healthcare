import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store'
import { homePath } from '../../utils/portal'
import { IconLogo } from '../shared'
import '../shared/views.css'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [regForm, setRegForm] = useState({
    username: '', password: '', confirmPassword: '', phone: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleRegChange = (e) => {
    setRegForm({ ...regForm, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('请输入用户名和密码')
      return
    }
    const res = await login(form.username, form.password)
    if (res.success) {
      const saved = JSON.parse(localStorage.getItem('wenrun_user') || '{}')
      navigate(homePath(saved.portalType), { replace: true })
    } else {
      setError(res.error || '登录失败')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (regForm.password !== regForm.confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    if (regForm.password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    const { register } = await import('../../api/modules/user')
    try {
      const data = await register(regForm)
      const { setToken } = await import('../../api/request')
      setToken(data.token)
      const u = {
        userId: data.userId, username: data.username,
        realName: data.realName, roleCode: data.roleCode,
        roleName: data.roleName, portalType: data.portalType,
        patientId: data.patientId, staffId: data.staffId,
        roles: data.roles,
      }
      localStorage.setItem('wenrun_user', JSON.stringify(u))
      navigate(homePath(u.portalType), { replace: true })
    } catch (e) {
      setError(e.message || '注册失败')
    }
  }

  return (
    <div className="login-scene view-grain">
      {/* 左侧品牌区 — PC */}
      <aside className="login-scene__brand">
        <div className="login-scene__brand-glow" />
        <div className="login-scene__brand-deco">温</div>
        <div>
          <p className="login-scene__brand-tagline">Warm Clinic</p>
          <h1>温润诊所</h1>
        </div>
        <blockquote className="login-scene__brand-quote">
          以温润之心，行精准之医。<br />
          智慧诊疗，从此触手可及。
        </blockquote>
      </aside>

      {/* 右侧表单区 */}
      <div className="login-scene__form-panel">
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="login-card__logo">
              <IconLogo />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: 'var(--c-brand)',
              letterSpacing: '0.04em',
              margin: 0,
            }}>
              {showRegister ? '创建账户' : '欢迎回来'}
            </h1>
            <p style={{ color: 'var(--c-sub)', fontSize: '0.88rem', marginTop: 8 }}>
              {showRegister ? '加入温润诊所，开启智慧诊疗之旅' : '登录您的患者账户'}
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--c-danger-bg)',
              color: 'var(--c-danger)',
              padding: '10px 16px',
              borderRadius: 'var(--radius)',
              fontSize: '0.85rem',
              marginBottom: 20,
              animation: 'fadeUp 300ms var(--ease-enter)',
            }}>
              {error}
            </div>
          )}

          {!showRegister ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-md">
                <label className="form-label">用户名</label>
                <input
                  className="input"
                  name="username"
                  placeholder="输入用户名"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">密码</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  placeholder="输入密码"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
              <button
                className="btn btn--primary btn--lg"
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: 8 }}
              >
                {loading ? '登录中…' : '登录'}
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                还没有账户？{' '}
                <button
                  type="button"
                  onClick={() => { setShowRegister(true); setError('') }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--c-accent)',
                    cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                  }}
                >
                  立即注册
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group mb-md">
                <label className="form-label">用户名</label>
                <input className="input" name="username" placeholder="设置登录用户名"
                  value={regForm.username} onChange={handleRegChange} />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">密码（至少 6 位）</label>
                <input className="input" type="password" name="password" placeholder="设置密码"
                  value={regForm.password} onChange={handleRegChange} />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">确认密码</label>
                <input className="input" type="password" name="confirmPassword" placeholder="再次输入密码"
                  value={regForm.confirmPassword} onChange={handleRegChange} />
              </div>
              <div className="form-group mb-md">
                <label className="form-label">手机号</label>
                <input className="input" name="phone" placeholder="输入手机号"
                  value={regForm.phone} onChange={handleRegChange} />
              </div>
              <button className="btn btn--primary btn--lg" type="submit"
                style={{ width: '100%', marginTop: 8 }}>
                注册并登录
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                已有账户？{' '}
                <button type="button"
                  onClick={() => { setShowRegister(false); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--c-accent)',
                    cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
                  返回登录
                </button>
              </p>
            </form>
          )}

          <div className="login-demo">
            <p className="login-demo__title">演示账号（密码均为 password）</p>
            <p>患者端：patient01 · 医生端：doctor01 · 管理端：admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
