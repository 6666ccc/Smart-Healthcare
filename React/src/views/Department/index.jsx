import { useState, useEffect } from 'react'
import { useIsPc } from '../../hooks'
import { Loading, Empty } from '../../components'
import { listDepts, listStaff } from '../../api'
import PcLayout from '../Home/pc/PcLayout'
import MobileTabbar from '../Home/mobile/MobileTabbar'
import { PageHeader, IconSearch } from '../shared'
import '../shared/views.css'

function HerbDeco({ type = 'leaf', style }) {
  const paths = {
    leaf: 'M12 2c-3 4-6 10-8 16 0 0 4 2 8 4 4-2 8-4 8-4-2-6-5-12-8-16z',
    root: 'M12 20c-2-4-4-8-6-10 2 0 4 1 6 2 2-1 4-2 6-2-2 2-4 6-6 10z',
    ginkgo: 'M12 4c-5 3-8 8-8 12 0 2 1 3 2 3s3 0 6-4c3 4 5 4 6 4s2-1 2-3c0-4-3-9-8-12z',
  }
  return (
    <svg viewBox="0 0 24 24" style={{ position: 'absolute', opacity: 0.05, ...style }}>
      <path d={paths[type] || paths.leaf} fill="currentColor" />
    </svg>
  )
}

function DeptCard({ dept, selectedDept, onSelectDept, staff, staffLoading, isPc }) {
  const isActive = selectedDept?.id === dept.id
  const herbType = dept.id % 3 === 0 ? 'ginkgo' : dept.id % 3 === 1 ? 'leaf' : 'root'

  return (
    <div
      className={`card view-dept-card${isActive ? ' view-dept-card--active card--accent-top' : ''}`}
      onClick={() => onSelectDept(isActive ? null : dept)}
    >
      <HerbDeco type={herbType}
        style={{ right: -10, bottom: -10, width: isPc ? 100 : 80, height: isPc ? 100 : 80, color: 'var(--c-brand)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600,
          fontSize: isPc ? '1.2rem' : '1.05rem', marginBottom: 4,
        }}>
          {dept.deptName}
        </div>
        <div className="text-muted text-sm">{dept.deptCode}</div>

        {isActive && (
          <div style={{ marginTop: isPc ? 16 : 12, animation: 'fadeUp 300ms var(--ease-enter)' }}>
            {isPc && <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>医生团队</h4>}
            {staffLoading ? <Loading /> : staff.length === 0 ? (
              <p className="text-muted text-sm">该科室暂无医生</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: isPc ? 'row' : 'column', flexWrap: 'wrap', gap: isPc ? 8 : 6 }}>
                {staff.map((s) => (
                  <div key={s.id} style={{
                    padding: isPc ? '10px 16px' : '8px 12px',
                    background: 'var(--c-bg)', borderRadius: 'var(--radius)',
                    minWidth: isPc ? 160 : undefined,
                    border: '1px solid var(--c-border-light)',
                  }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.name}</div>
                    <div className="text-sub text-sm">{s.title}{!isPc && ` · ${s.staffNo}`}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DepartmentContent({ depts, loading, error, selectedDept, onSelectDept, staff, staffLoading, isPc, search, setSearch }) {
  const filtered = depts.filter(d => d.status === 1 && (
    !search || d.deptName.includes(search) || d.deptCode.includes(search)
  ))

  return (
    <>
      <PageHeader
        title="科室浏览"
        subtitle="浏览诊所各科室信息及医生团队"
      />

      {!loading && depts.length > 0 && (
        <div className="view-search">
          <IconSearch />
          <input
            className="input"
            placeholder="搜索科室名称或编码…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {error && <div className="card mb-md" style={{ color: 'var(--c-danger)', textAlign: 'center' }}>{error}</div>}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty text={search ? '未找到匹配的科室' : '暂无科室数据'} icon="🏥" />
      ) : (
        <div className="stagger" style={{
          display: isPc ? 'grid' : 'flex',
          gridTemplateColumns: isPc ? 'repeat(auto-fill, minmax(280px, 1fr))' : undefined,
          flexDirection: isPc ? undefined : 'column',
          gap: isPc ? 16 : 12,
        }}>
          {filtered.map((dept) => (
            <DeptCard
              key={dept.id}
              dept={dept}
              selectedDept={selectedDept}
              onSelectDept={onSelectDept}
              staff={staff}
              staffLoading={staffLoading}
              isPc={isPc}
            />
          ))}
        </div>
      )}
    </>
  )
}

/* ==================== 入口 ==================== */
export default function Department() {
  const isPc = useIsPc()
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDept, setSelectedDept] = useState(null)
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const list = await listDepts({ status: 1 })
        setDepts(Array.isArray(list) ? list : [])
      } catch (e) { setError(e.message || '加载失败') }
      finally { setLoading(false) }
    })()
  }, [])

  const onSelectDept = async (dept) => {
    setSelectedDept(dept)
    if (!dept) { setStaff([]); return }
    setStaffLoading(true)
    try {
      const list = await listStaff({ deptId: dept.id, status: 1 })
      setStaff(Array.isArray(list) ? list : [])
    } catch { setStaff([]) }
    finally { setStaffLoading(false) }
  }

  const contentProps = { depts, loading, error, selectedDept, onSelectDept, staff, staffLoading, isPc, search, setSearch }

  if (isPc) {
    return (
      <PcLayout>
        <DepartmentContent {...contentProps} />
      </PcLayout>
    )
  }

  return (
    <div className="page">
      <DepartmentContent {...contentProps} />
      <MobileTabbar />
    </div>
  )
}
