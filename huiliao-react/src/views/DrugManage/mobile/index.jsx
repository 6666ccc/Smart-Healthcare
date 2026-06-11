import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { listDrugs, createDrug, updateDrug } from '../../../api/modules/drug'
import { listDrugStocks } from '../../../api/modules/drugStock'
import { getPortalType } from '../../Home/role'
import { formatMoney } from '../../../utils'
import MobileTabbar from '../../Home/MobileTabbar'
import { IconPlus } from '../../Assistant/icons'
import './index.css'

const emptyForm = { name: '', spec: '', unit: '', price: '', manufacturer: '', status: 1 }

export default function DrugManageMobile() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [drugs, setDrugs] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      const [drugData, stockData] = await Promise.allSettled([listDrugs(params), listDrugStocks()])
      if (drugData.status === 'fulfilled') setDrugs(Array.isArray(drugData.value) ? drugData.value : [])
      if (stockData.status === 'fulfilled') setStocks(Array.isArray(stockData.value) ? stockData.value : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [keyword])

  useEffect(() => { loadData() }, [loadData])

  const getStock = (drugId) => stocks.find((s) => String(s.drugId) === String(drugId))

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true) }
  const openEdit = (d) => {
    setEditing(d)
    setForm({
      name: d.name || d.drugName || '', spec: d.spec || '', unit: d.unit || '',
      price: d.price ?? '', manufacturer: d.manufacturer || '', status: d.status ?? 1,
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

  return (
    <div className="drug-page">
      <header className="drug-header">
        <h1>药品管理</h1>
        <button type="button" className="drug-header-add" onClick={openCreate}><IconPlus /></button>
      </header>

      <div className="drug-search-bar">
        <input type="search" placeholder="搜索药品…" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadData() }} />
        <button type="button" onClick={loadData}>搜索</button>
      </div>

      <main className="drug-main">
        {loading && <p className="drug-empty">加载中…</p>}
        {!loading && drugs.length === 0 && <p className="drug-empty">暂无药品记录</p>}
        {drugs.map((d) => {
          const stock = getStock(d.id)
          const lowStock = stock && stock.stock != null && stock.stock < (stock.lowThreshold ?? 10)
          return (
            <div key={d.id} className="drug-card" onClick={() => openEdit(d)}>
              <div className="drug-card-body">
                <div className="drug-card-top">
                  <strong>{d.name || d.drugName}</strong>
                  {d.status !== 1 && <span className="drug-off-badge">停用</span>}
                  {lowStock && <span className="drug-low-badge">库存不足</span>}
                </div>
                <div className="drug-meta">
                  {d.spec && <span>{d.spec}</span>}
                  {d.manufacturer && <span>{d.manufacturer}</span>}
                </div>
              </div>
              <div className="drug-card-right">
                {d.price != null && <strong>{formatMoney(d.price)}</strong>}
                {stock && <span className={`drug-stock${lowStock ? ' drug-stock--low' : ''}`}>库存：{stock.stock ?? '—'}</span>}
                <span className="drug-arrow">›</span>
              </div>
            </div>
          )
        })}
      </main>

      {showForm && (
        <div className="drug-overlay" onClick={() => { setShowForm(false); setEditing(null); setError('') }}>
          <div className="drug-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? '编辑药品' : '新增药品'}</h2>
            {error && <p className="shared-error">{error}</p>}
            <label className="drug-field">
              <span>药品名称 *</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="药品名称" />
            </label>
            <div className="drug-row">
              <label className="drug-field">
                <span>规格</span>
                <input value={form.spec} onChange={(e) => setForm((f) => ({ ...f, spec: e.target.value }))} placeholder="规格" />
              </label>
              <label className="drug-field">
                <span>单位</span>
                <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="单位" />
              </label>
            </div>
            <div className="drug-row">
              <label className="drug-field">
                <span>单价</span>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
              </label>
              <label className="drug-field">
                <span>状态</span>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}>
                  <option value={1}>启用</option>
                  <option value={0}>停用</option>
                </select>
              </label>
            </div>
            <label className="drug-field">
              <span>生产厂商</span>
              <input value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} placeholder="生产厂商" />
            </label>
            <button type="button" className="shared-btn-submit" style={{ width: '100%', marginTop: '.5rem' }} disabled={submitting} onClick={handleSave}>
              {submitting ? '保存中…' : (editing ? '保存修改' : '确认新增')}
            </button>
          </div>
        </div>
      )}

      <MobileTabbar portal={portal} />
    </div>
  )
}
