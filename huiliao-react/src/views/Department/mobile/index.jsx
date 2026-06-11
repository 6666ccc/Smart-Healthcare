import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../store'
import { listDepts } from '../../../api/modules/department'
import { listStaff } from '../../../api/modules/staff'
import { getPortalType } from '../../Home/role'
import MobileTabbar from '../../Home/MobileTabbar'

export default function DepartmentMobile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)

  const loadDepts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listDepts()
      setDepts(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDepts() }, [loadDepts])

  const handleSelect = useCallback(async (dept) => {
    setSelectedDept(dept)
    setStaffLoading(true)
    try {
      const data = await listStaff({ deptId: dept.id })
      setStaffList(Array.isArray(data) ? data : [])
    } catch { setStaffList([]) }
    finally { setStaffLoading(false) }
  }, [])

  if (selectedDept) {
    return (
      <div className="dept-page">
        <header className="dept-header">
          <button type="button" className="dept-back" onClick={() => setSelectedDept(null)}>← 返回</button>
          <h1>{selectedDept.name || selectedDept.deptName}</h1>
        </header>
        <main className="dept-detail">
          {selectedDept.description && <p className="dept-desc">{selectedDept.description}</p>}
          <div className="dept-meta">
            <span>{selectedDept.status === 1 ? '🟢 开诊' : '⚫ 停诊'}</span>
            {selectedDept.location && <span>📍 {selectedDept.location}</span>}
            {selectedDept.phone && <span>📞 {selectedDept.phone}</span>}
          </div>
          <h2>科室医生</h2>
          {staffLoading && <p className="dept-empty">加载中…</p>}
          {!staffLoading && staffList.length === 0 && <p className="dept-empty">暂无医护人员</p>}
          {staffList.map((s) => (
            <div key={s.id} className="dept-staff-card">
              <span className="dept-staff-avatar">{(s.name || s.realName || '医').charAt(0)}</span>
              <div>
                <strong>{s.name || s.realName || `员工 #${s.id}`}</strong>
                <span>{s.title || s.position || '—'}</span>
              </div>
            </div>
          ))}
        </main>
        <MobileTabbar portal={portal} />
      </div>
    )
  }

  return (
    <div className="dept-page">
      <header className="dept-header">
        <h1>科室查询</h1>
      </header>
      <main className="dept-main">
        {loading && <p className="dept-empty">加载中…</p>}
        {!loading && depts.length === 0 && <p className="dept-empty">暂未开放科室</p>}
        {depts.map((d) => (
          <button key={d.id} type="button" className="dept-card" onClick={() => handleSelect(d)}>
            <span className="dept-card-icon">{(d.name || d.deptName || '科').charAt(0)}</span>
            <div className="dept-card-body">
              <strong>{d.name || d.deptName || `科室 #${d.id}`}</strong>
              {d.description && <span>{d.description}</span>}
            </div>
            <span className="dept-card-arrow">›</span>
          </button>
        ))}
      </main>
      <MobileTabbar portal={portal} />
    </div>
  )
}
