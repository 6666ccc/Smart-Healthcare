/* eslint-disable react-hooks/set-state-in-effect -- legacy patient loader intentionally updates state after the authenticated context resolves */
import { useState, useEffect } from 'react'
import { useAuth } from '../../store'
import { useIsPc, useLogout } from '../../hooks'
import { Loading } from '../../components'
import { getPatient, updatePatient } from '../../api'
import { GENDER_MAP, formatDate } from '../../utils'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader } from '../shared'
import '../shared/views.css'

/* ==================== 移动端 ==================== */
function UserMobile({ patient, loading, error, isEditing, setIsEditing, editForm, setEditForm, handleSave, saving, msg }) {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <div className="page">
      <PageHeader title="个人中心" subtitle="查看和编辑您的档案信息" />

      {msg && (
        <div className="card mb-md" style={{
          color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
          textAlign: 'center', animation: 'fadeUp 300ms var(--ease-enter)',
        }}>
          {msg}
        </div>
      )}
      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : !patient ? <div className="card" style={{ textAlign: 'center', color: 'var(--c-sub)' }}>暂无患者档案</div> : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 头像区 */}
          <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div className="view-avatar-ring" style={{ width: 72, height: 72 }}>
              <div className="view-avatar-ring__inner" style={{ fontSize: 28 }}>
                {(patient.name || user?.username || '?')[0]}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600 }}>
              {patient.name || user?.username || '未设置姓名'}
            </div>
            <div className="text-muted text-sm">{patient.patientNo}</div>
          </div>

          {/* 信息卡 */}
          <div className="card">
            <div className="flex-between mb-md">
              <h3 style={{ margin: 0 }}>档案信息</h3>
              <button className="btn btn--outline btn--sm"
                onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? '取消编辑' : '编辑'}
              </button>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormField label="姓名" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                <div className="form-group">
                  <label className="form-label">性别</label>
                  <select className="input" value={editForm.gender ?? ''}
                    onChange={e => setEditForm({ ...editForm, gender: Number(e.target.value) })}>
                    <option value="">请选择</option>
                    <option value="0">女</option>
                    <option value="1">男</option>
                  </select>
                </div>
                <FormField label="手机号" value={editForm.phone || ''} onChange={v => setEditForm({ ...editForm, phone: v })} />
                <FormField label="身份证号" value={editForm.idCard || ''} onChange={v => setEditForm({ ...editForm, idCard: v })} />
                <FormField label="出生日期" value={editForm.birthDate || ''} onChange={v => setEditForm({ ...editForm, birthDate: v })} placeholder="如 1990-05-20" />
                <FormField label="地址" value={editForm.address || ''} onChange={v => setEditForm({ ...editForm, address: v })} />
                <FormField label="过敏史" value={editForm.allergyHistory || ''} onChange={v => setEditForm({ ...editForm, allergyHistory: v })} placeholder="例如：青霉素过敏" />
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                <InfoItem label="姓名" value={patient.name} />
                <InfoItem label="性别" value={GENDER_MAP[patient.gender] || '未知'} />
                <InfoItem label="手机号" value={patient.phone} />
                <InfoItem label="身份证号" value={patient.idCard} />
                <InfoItem label="出生日期" value={formatDate(patient.birthDate)} />
                <InfoItem label="地址" value={patient.address} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoItem label="过敏史" value={patient.allergyHistory || '无'} />
                </div>
              </div>
            )}
          </div>

          {/* 退出登录 */}
          <button className="btn btn--danger" onClick={logout} style={{ width: '100%' }}>
            退出登录
          </button>
        </div>
      )}

      <MobileTabbar />
    </div>
  )
}

/* ==================== PC 端 ==================== */
function UserPc({ patient, loading, error, isEditing, setIsEditing, editForm, setEditForm, handleSave, saving, msg }) {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <PcLayout>
      <PageHeader title="个人中心" subtitle="查看和编辑您的档案信息" />

      {msg && <div className="card mb-md" style={{
        color: msg.includes('成功') ? 'var(--c-success)' : 'var(--c-danger)',
        textAlign: 'center',
      }}>{msg}</div>}
      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : !patient ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--c-sub)' }}>
          暂无患者档案，请先完善个人信息
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', gap: 24 }}>
          {/* 左侧头像卡 */}
          <div style={{ width: 240, flexShrink: 0 }}>
            <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div className="view-avatar-ring">
                <div className="view-avatar-ring__inner">
                  {(patient.name || user?.username || '?')[0]}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 600, marginBottom: 4 }}>
                {patient.name || user?.username || '未设置'}
              </div>
              <div className="text-muted text-sm">{patient.patientNo}</div>
              <button className="btn btn--danger btn--sm" onClick={logout}
                style={{ width: '100%', marginTop: 24 }}>
                退出登录
              </button>
            </div>
          </div>

          {/* 右侧信息卡 */}
          <div style={{ flex: 1 }}>
            <div className="card">
              <div className="flex-between mb-lg">
                <h3 style={{ margin: 0 }}>档案信息</h3>
                <button className="btn btn--outline btn--sm"
                  onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? '取消编辑' : '编辑资料'}
                </button>
              </div>

              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                  <FormField label="姓名" value={editForm.name} onChange={v => setEditForm({ ...editForm, name: v })} />
                  <div className="form-group">
                    <label className="form-label">性别</label>
                    <select className="input" value={editForm.gender ?? ''}
                      onChange={e => setEditForm({ ...editForm, gender: Number(e.target.value) })}>
                      <option value="">请选择</option>
                      <option value="0">女</option>
                      <option value="1">男</option>
                    </select>
                  </div>
                  <FormField label="手机号" value={editForm.phone || ''} onChange={v => setEditForm({ ...editForm, phone: v })} />
                  <FormField label="身份证号" value={editForm.idCard || ''} onChange={v => setEditForm({ ...editForm, idCard: v })} />
                  <FormField label="出生日期" value={editForm.birthDate || ''} onChange={v => setEditForm({ ...editForm, birthDate: v })} placeholder="1990-05-20" />
                  <FormField label="地址" value={editForm.address || ''} onChange={v => setEditForm({ ...editForm, address: v })} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FormField label="过敏史" value={editForm.allergyHistory || ''} onChange={v => setEditForm({ ...editForm, allergyHistory: v })} placeholder="例如：青霉素过敏" />
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                      {saving ? '保存中…' : '保存修改'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
                  <InfoItem label="姓名" value={patient.name} />
                  <InfoItem label="性别" value={GENDER_MAP[patient.gender] || '未知'} />
                  <InfoItem label="手机号" value={patient.phone} />
                  <InfoItem label="身份证号" value={patient.idCard} />
                  <InfoItem label="出生日期" value={formatDate(patient.birthDate)} />
                  <InfoItem label="地址" value={patient.address} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <InfoItem label="过敏史" value={patient.allergyHistory || '无'} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PcLayout>
  )
}

/* ==================== 子组件 ==================== */
function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-muted text-sm">{label}</div>
      <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{value || '—'}</div>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

/* ==================== 入口 ==================== */
export default function User() {
  const isPc = useIsPc()
  const { user, updateUser } = useAuth()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user?.patientId) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      try {
        const data = await getPatient(user.patientId)
        setPatient(data)
        setEditForm({
          name: data.name || '',
          gender: data.gender,
          phone: data.phone || '',
          idCard: data.idCard || '',
          birthDate: data.birthDate || '',
          address: data.address || '',
          allergyHistory: data.allergyHistory || '',
        })
      } catch (e) {
        setError(e.message || '加载失败')
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.patientId])

  const handleSave = async () => {
    if (!user?.patientId) return
    setSaving(true); setMsg('')
    try {
      // 更新患者档案
      await updatePatient(user.patientId, editForm)

      // 同步更新用户信息（如果姓名有变）
      const { updateProfile } = await import('../../api/modules/user')
      try {
        await updateProfile({
          realName: editForm.name,
          phone: editForm.phone,
          gender: editForm.gender,
          birthDate: editForm.birthDate,
          idCard: editForm.idCard,
          address: editForm.address,
          allergyHistory: editForm.allergyHistory,
        })
      } catch { /* 用户接口可能不支持部分字段，忽略 */ }

      setMsg('保存成功')
      setIsEditing(false)
      // 刷新
      const data = await getPatient(user.patientId)
      setPatient(data)
      if (editForm.name && editForm.name !== user.realName) {
        updateUser({ realName: editForm.name })
      }
    } catch (e) {
      setMsg(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const props = { patient, loading, error, isEditing, setIsEditing, editForm, setEditForm, handleSave, saving, msg }
  return isPc ? <UserPc {...props} /> : <UserMobile {...props} />
}
