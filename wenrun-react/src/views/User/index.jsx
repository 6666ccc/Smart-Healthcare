import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UserRound, Phone, MapPin, IdCard, CalendarDays, Pencil, LogOut,
  AlertTriangle, Contact, Wallet, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../store'
import { useIsPc, useLogout } from '../../hooks'
import { Loading } from '../../components'
import { getPatient, updatePatient } from '../../api'
import { GENDER_MAP, formatDate } from '../../utils'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { IconCalendar } from '../shared'
import '../shared/views.css'
import './user.css'

const QUICK_LINKS = [
  { icon: IconCalendar, label: '预约挂号', to: '/registration', color: '#3d5a5c' },
  { icon: Wallet, label: '门诊缴费', to: '/payment', color: '#c8944a' },
  { icon: Sparkles, label: 'AI 助手', to: '/assistant', color: '#5a8590' },
]

function Toast({ msg }) {
  if (!msg) return null
  const ok = msg.includes('成功')
  return <div className={`user-toast ${ok ? 'user-toast--success' : 'user-toast--error'}`}>{msg}</div>
}

function ProfileHero({ patient, user, isPc, isEditing, onToggleEdit }) {
  const initial = (patient?.name || user?.username || '?')[0]
  const name = patient?.name || user?.username || '未设置姓名'

  return (
    <div className={`user-profile-hero${isPc ? ' user-profile-hero--pc' : ''}`}>
      <div className="user-profile-hero__inner">
        <div className="user-profile-hero__avatar">
          <div className="user-profile-hero__avatar-inner">{initial}</div>
        </div>
        <div className={isPc ? 'user-profile-hero__body' : undefined}>
          <h2 className="user-profile-hero__name">{name}</h2>
          <div className="user-profile-hero__meta">
            <span className="user-profile-hero__badge">
              <span className="user-profile-hero__badge-dot" />
              患者档案
            </span>
            {patient?.patientNo && (
              <span className="user-profile-hero__badge">编号 {patient.patientNo}</span>
            )}
          </div>
        </div>
        {!isEditing && (
          <div className="user-profile-hero__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onToggleEdit}>
              <Pencil size={14} strokeWidth={2} style={{ marginRight: 4, verticalAlign: -2 }} />
              编辑资料
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickLinks() {
  return (
    <div className="user-quick-links">
      {QUICK_LINKS.map((item, i) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className="user-quick-link"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="user-quick-link__icon" style={{ background: `${item.color}12`, color: item.color }}>
              <Icon size={20} color={item.color} strokeWidth={1.75} />
            </div>
            <span className="user-quick-link__label">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, alert }) {
  return (
    <div className={`user-info-row${alert ? ' user-info-row--alert' : ''}`}>
      <div className="user-info-row__icon">
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <div className="user-info-row__body">
        <span className="user-info-row__label">{label}</span>
        <span className="user-info-row__value">{value || '—'}</span>
      </div>
    </div>
  )
}

function ProfileSection({ title, icon: Icon, color, children, className = '' }) {
  return (
    <section className={`user-section ${className}`}>
      <div className="user-section__head">
        <div className="user-section__head-icon" style={{ background: `${color}14`, color }}>
          <Icon size={17} strokeWidth={1.75} />
        </div>
        <h3 className="user-section__title">{title}</h3>
      </div>
      <div className="user-section__body">{children}</div>
    </section>
  )
}

function AllergyBanner({ value }) {
  const text = value || '暂无已知过敏史'
  const hasAllergy = Boolean(value)
  return (
    <div className="user-allergy-banner">
      <div className="user-allergy-banner__icon">
        <AlertTriangle size={18} strokeWidth={1.75} />
      </div>
      <div className="user-allergy-banner__text">
        <div className="user-allergy-banner__label">{hasAllergy ? '过敏提醒' : '过敏史'}</div>
        <div className="user-allergy-banner__value">{text}</div>
      </div>
    </div>
  )
}

function ProfileView({ patient }) {
  return (
    <div className="user-sections">
      <div className="user-pc-grid">
        <ProfileSection title="基本信息" icon={UserRound} color="#3d5a5c">
          <InfoRow icon={UserRound} label="姓名" value={patient.name} />
          <InfoRow icon={Contact} label="性别" value={GENDER_MAP[patient.gender] || '未知'} />
          <InfoRow icon={CalendarDays} label="出生日期" value={formatDate(patient.birthDate)} />
        </ProfileSection>

        <ProfileSection title="联系方式" icon={Phone} color="#5a8590">
          <InfoRow icon={Phone} label="手机号" value={patient.phone} />
          <InfoRow icon={MapPin} label="联系地址" value={patient.address} />
        </ProfileSection>

        <ProfileSection title="健康档案" icon={IdCard} color="#7a9e85" className="user-section--full">
          <InfoRow icon={IdCard} label="身份证号" value={patient.idCard} />
          <AllergyBanner value={patient.allergyHistory} />
        </ProfileSection>
      </div>
    </div>
  )
}

function ProfileEdit({ editForm, setEditForm, onSave, saving, onCancel }) {
  return (
    <div className="user-section">
      <div className="user-section__head">
        <div className="user-section__head-icon" style={{ background: 'rgba(61, 90, 92, 0.1)', color: '#3d5a5c' }}>
          <Pencil size={17} strokeWidth={1.75} />
        </div>
        <h3 className="user-section__title">编辑档案</h3>
      </div>
      <div className="user-edit-grid">
        <FormField label="姓名" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
        <div className="form-group">
          <label className="form-label">性别</label>
          <select
            className="input"
            value={editForm.gender ?? ''}
            onChange={(e) => setEditForm({ ...editForm, gender: Number(e.target.value) })}
          >
            <option value="">请选择</option>
            <option value="0">女</option>
            <option value="1">男</option>
          </select>
        </div>
        <FormField label="手机号" value={editForm.phone || ''} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
        <FormField label="身份证号" value={editForm.idCard || ''} onChange={(v) => setEditForm({ ...editForm, idCard: v })} />
        <FormField label="出生日期" value={editForm.birthDate || ''} onChange={(v) => setEditForm({ ...editForm, birthDate: v })} placeholder="如 1990-05-20" />
        <FormField label="联系地址" value={editForm.address || ''} onChange={(v) => setEditForm({ ...editForm, address: v })} />
        <div className="form-group user-edit-field--full">
          <label className="form-label">过敏史</label>
          <input
            className="input"
            value={editForm.allergyHistory || ''}
            placeholder="例如：青霉素过敏（无则留空）"
            onChange={(e) => setEditForm({ ...editForm, allergyHistory: e.target.value })}
          />
        </div>
      </div>
      <div className="user-edit-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>取消</button>
        <button type="button" className="btn btn--primary" onClick={onSave} disabled={saving}>
          {saving ? '保存中…' : '保存修改'}
        </button>
      </div>
    </div>
  )
}

function AccountLogout({ onLogout }) {
  return (
    <div className="user-account-card">
      <button type="button" className="user-account-row" onClick={onLogout}>
        <span className="user-account-row__icon">
          <LogOut size={17} strokeWidth={1.75} />
        </span>
        <span className="user-account-row__label">退出登录</span>
      </button>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function UserContent({ patient, loading, error, isEditing, setIsEditing, editForm, setEditForm, handleSave, saving, msg, isPc }) {
  const { user } = useAuth()
  const logout = useLogout()

  if (loading) return <Loading />
  if (error) return <div className="user-toast user-toast--error">{error}</div>
  if (!patient) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--c-sub)' }}>
        暂无患者档案，请先完善个人信息
      </div>
    )
  }

  return (
    <>
      <Toast msg={msg} />
      <ProfileHero
        patient={patient}
        user={user}
        isPc={isPc}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(true)}
      />
      {!isEditing && <QuickLinks />}
      {isEditing ? (
        <ProfileEdit
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSave}
          saving={saving}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileView patient={patient} />
      )}
      <AccountLogout onLogout={logout} />
    </>
  )
}

function UserMobile(props) {
  return (
    <div className="page">
      <UserContent {...props} isPc={false} />
      <MobileTabbar />
    </div>
  )
}

function UserPc(props) {
  return (
    <PcLayout>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)' }}>个人中心</h1>
        <p className="text-sub" style={{ margin: 0 }}>管理您的患者档案与健康信息</p>
      </div>
      <UserContent {...props} isPc />
    </PcLayout>
  )
}

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
    setSaving(true)
    setMsg('')
    try {
      await updatePatient(user.patientId, editForm)

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
      } catch { /* ignore */ }

      setMsg('保存成功')
      setIsEditing(false)
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

  const props = {
    patient, loading, error, isEditing, setIsEditing,
    editForm, setEditForm, handleSave, saving, msg,
  }

  return isPc ? <UserPc {...props} /> : <UserMobile {...props} />
}
