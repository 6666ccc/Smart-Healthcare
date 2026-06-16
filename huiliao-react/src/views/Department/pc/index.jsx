import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../store'
import { Skeleton } from '../../../components'
import { listDepts } from '../../../api/modules/department'
import { listStaff } from '../../../api/modules/staff'
import { getPortalType } from '../../Home/role'
import { PcLayout } from '../../../layouts'
import './index.css'

export default function DepartmentPc() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  const [depts, setDepts] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState(null)
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

  return (
    <PcLayout portal={portal} searchPlaceholder="搜索科室…">
      <div className="home-pc-body dept-pc-body">
        <div className="dept-pc-grid">
          {/* 科室列表 */}
          <div className="dept-pc-list-panel">
            <h1 className="dept-pc-title">科室查询</h1>
            {loading && <Skeleton variant="card" count={5} />}
            {!loading && depts.length === 0 && <p className="dept-pc-empty">暂未开放科室</p>}
            <div className="dept-pc-list">
              {depts.map((d) => (
                <button key={d.id} type="button"
                  className={`dept-pc-item${selectedDept?.id === d.id ? ' dept-pc-item--active' : ''}`}
                  onClick={() => handleSelect(d)}>
                  <span className="dept-pc-item-icon">{(d.name || d.deptName || '科').charAt(0)}</span>
                  <div className="dept-pc-item-body">
                    <strong>{d.name || d.deptName || `科室 #${d.id}`}</strong>
                    {d.description && <span>{d.description}</span>}
                  </div>
                  <span className="dept-pc-item-status" style={{ color: d.status === 1 ? '#5a9e8f' : '#9ca3af' }}>
                    {d.status === 1 ? '开诊' : '停诊'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 科室详情 + 医护人员 */}
          <div className="dept-pc-detail-panel">
            {!selectedDept ? (
              <div className="dept-pc-placeholder">
                <p>← 请选择左侧科室查看详情</p>
              </div>
            ) : (
              <>
                <h2>{selectedDept.name || selectedDept.deptName}</h2>
                {selectedDept.description && <p className="dept-pc-desc">{selectedDept.description}</p>}
                <div className="dept-pc-info">
                  <span>状态：{selectedDept.status === 1 ? '🟢 开诊' : '⚫ 停诊'}</span>
                  {selectedDept.location && <span>位置：{selectedDept.location}</span>}
                  {selectedDept.phone && <span>电话：{selectedDept.phone}</span>}
                </div>
                <h3>科室医护人员</h3>
                {staffLoading && <Skeleton variant="card" count={5} />}
                {!staffLoading && staffList.length === 0 && <p className="dept-pc-empty">暂无医护人员</p>}
                <div className="dept-pc-staff-list">
                  {staffList.map((s) => (
                    <div key={s.id} className="dept-pc-staff-card">
                      <span className="dept-pc-staff-avatar">{(s.name || s.realName || '医').charAt(0)}</span>
                      <div>
                        <strong>{s.name || s.realName || `员工 #${s.id}`}</strong>
                        <span>{s.title || s.position || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PcLayout>
  )
}
