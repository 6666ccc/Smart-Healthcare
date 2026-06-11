import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listDrugs, createDrug, updateDrug } from '../../../api/modules/drug'
import { listDrugStocks } from '../../../api/modules/drugStock'
import {
  SIDEBAR_NAV_BY_PORTAL, SIDEBAR_BOTTOM_BY_PORTAL,
} from '../../Home/data'
import { getPortalLabel, getPortalType } from '../../Home/role'
import {
  IconChevronDown, IconHeadset, IconLogo, IconMessage, IconSearch, IconSparkles, NavIcon,
} from '../../Home/icons'
import { formatMoney } from '../../../utils'
import '../../Home/pc/index.css'
import './index.css'

const emptyForm = { name: '', spec: '', unit: '', price: '', manufacturer: '', status: 1 }

export default function DrugManagePc() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const portal = getPortalType(user)
  const portalLabel = getPortalLabel(portal)
  const displayName = user?.realName || user?.username || '用户'

  const [drugs, setDrugs] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const sidebarNav = SIDEBAR_NAV_BY_PORTAL[portal] ?? []
  const sidebarBottom = SIDEBAR_BOTTOM_BY_PORTAL[portal] ?? []
  const isActiveNav = (path) => pathname === path

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      const [drugData, stockData] = await Promise.allSettled([
        listDrugs(params), listDrugStocks(),
      ])
      if (drugData.status === 'fulfilled') setDrugs(Array.isArray(drugData.value) ? drugData.value : [])
      if (stockData.status === 'fulfilled') setStocks(Array.isArray(stockData.value) ? stockData.value : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [keyword])

  useEffect(() => { loadData() }, [loadData])

  const getStock = (drugId) => stocks.find((s) => String(s.drugId) === String(drugId))

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setError(''); setShowForm(true)
  }

  const openEdit = (d) => {
    setEditing(d)
    setForm({
      name: d.name || d.drugName || '',
      spec: d.spec || '',
      unit: d.unit || '',
      price: d.price ?? '',
      manufacturer: d.manufacturer || '',
      status: d.status ?? 1,
    })
    setError(''); setShowForm(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('请输入药品名称'); return }
    setSubmitting(true)
    try {
      if (editing) await updateDrug(editing.id, form)
      else await createDrug(form)
      setShowForm(false); setEditing(null); loadData()
    } catch (err) { setError(err.message || '保存失败') }
    finally { setSubmitting(false) }
  }

  const handleSearch = () => loadData()

  return (
    <div className={`drug-pc home-pc home-pc--${portal}`}>
      <aside className="home-pc-sidebar">
        <div className="home-pc-brand">
          <span className="home-pc-brand-logo"><IconLogo /></span>
          <span className="home-pc-brand-text"><strong>慧疗</strong><span>{portalLabel}</span></span>
        </div>
        <nav className="home-pc-nav">
          {sidebarNav.map((item) => (
            <button key={item.id} type="button"
              className={`home-pc-nav-item${isActiveNav(item.path) ? ' home-pc-nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}>
              <NavIcon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="home-pc-sidebar-bottom">
          {sidebarBottom.map((item) => (
            <button key={item.id} type="button" className="home-pc-nav-item home-pc-nav-item--sub"
              onClick={() => navigate(item.path)}>
              <NavIcon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
          <button type="button" className="home-pc-ai-btn" onClick={() => navigate('/assistant')}>
            <IconSparkles /><span>AI 助手</span>
          </button>
        </div>
      </aside>

      <div className="home-pc-main">
        <header className="home-pc-header">
          <button type="button" className="home-pc-hospital">
            <span>杭州市第一人民医院</span><IconChevronDown />
          </button>
          <label className="home-pc-search">
            <IconSearch />
            <input type="search" placeholder="搜索药品名称…" value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
          </label>
          <div className="home-pc-header-actions">
            <button type="button" className="home-pc-icon-btn"><IconMessage /></button>
            <button type="button" className="home-pc-user" onClick={() => navigate('/user')}>
              <span className="home-pc-user-avatar">{displayName.charAt(0)}</span>
              <span className="home-pc-user-info"><strong>{displayName}</strong><span>{user?.roleName || portalLabel}</span></span>
            </button>
          </div>
        </header>

        <div className="home-pc-body">
          <div className="drug-pc-toolbar">
            <h1 className="drug-pc-title">药品管理</h1>
            <button type="button" className="drug-pc-create-btn" onClick={openCreate}>+ 新增药品</button>
          </div>

          {loading && <p className="drug-pc-empty">加载中…</p>}
          {!loading && drugs.length === 0 && <p className="drug-pc-empty">暂无药品记录</p>}

          <div className="drug-pc-list">
            {drugs.map((d) => {
              const stock = getStock(d.id)
              const lowStock = stock && stock.stock != null && stock.stock < (stock.lowThreshold ?? 10)
              return (
                <div key={d.id} className="drug-pc-card">
                  <div className="drug-pc-card-body">
                    <div className="drug-pc-card-top">
                      <strong>{d.name || d.drugName || `药品 #${d.id}`}</strong>
                      <span className={`drug-pc-status-badge${d.status === 1 ? '' : ' drug-pc-status-badge--off'}`}>
                        {d.status === 1 ? '启用' : '停用'}
                      </span>
                      {lowStock && <span className="drug-pc-low-badge">库存不足</span>}
                    </div>
                    <div className="drug-pc-meta">
                      {d.spec && <span>规格：{d.spec}</span>}
                      {d.unit && <span>单位：{d.unit}</span>}
                      {d.manufacturer && <span>厂商：{d.manufacturer}</span>}
                    </div>
                  </div>
                  <div className="drug-pc-card-right">
                    <div className="drug-pc-card-stats">
                      {d.price != null && <strong>{formatMoney(d.price)}</strong>}
                      {stock && <span className={`drug-pc-stock${lowStock ? ' drug-pc-stock--low' : ''}`}>
                        库存：{stock.stock ?? '—'}{stock.unit ? ` ${stock.unit}` : ''}
                      </span>}
                    </div>
                    <button type="button" className="drug-pc-edit-btn" onClick={() => openEdit(d)}>编辑</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showForm && (
          <div className="drug-pc-overlay" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>
            <div className="drug-pc-modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? '编辑药品' : '新增药品'}</h2>
              {error && <p className="shared-error">{error}</p>}
              <div className="drug-pc-form">
                <label className="drug-pc-field">
                  <span>药品名称 *</span>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="药品名称" />
                </label>
                <div className="drug-pc-row">
                  <label className="drug-pc-field">
                    <span>规格</span>
                    <input value={form.spec} onChange={(e) => setForm((f) => ({ ...f, spec: e.target.value }))} placeholder="如：0.3g×24片" />
                  </label>
                  <label className="drug-pc-field">
                    <span>单位</span>
                    <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="如：盒" />
                  </label>
                </div>
                <div className="drug-pc-row">
                  <label className="drug-pc-field">
                    <span>单价</span>
                    <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
                  </label>
                  <label className="drug-pc-field">
                    <span>状态</span>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}>
                      <option value={1}>启用</option>
                      <option value={0}>停用</option>
                    </select>
                  </label>
                </div>
                <label className="drug-pc-field">
                  <span>生产厂商</span>
                  <input value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} placeholder="生产厂商" />
                </label>
              </div>
              <div className="drug-pc-modal-actions">
                <button type="button" className="shared-btn-cancel" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>取消</button>
                <button type="button" className="shared-btn-submit" disabled={submitting} onClick={handleSave}>
                  {submitting ? '保存中…' : (editing ? '保存修改' : '确认新增')}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="home-pc-footer">
          <p>© 2025 杭州市第一人民医院 · 浙ICP备05012345号-1</p>
          <div className="home-pc-footer-links">
            <button type="button">隐私政策</button><span>·</span>
            <button type="button">服务协议</button><span>·</span>
            <button type="button">帮助中心</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
