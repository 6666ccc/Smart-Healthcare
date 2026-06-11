import { useAuth } from '../../../store'
import { getPortalType, PORTAL } from '../role'
import AdminHomePc from './AdminHome'
import DoctorHomePc from './DoctorHome'
import PatientHomePc from './PatientHome'

export default function HomePc() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  if (portal === PORTAL.DOCTOR) return <DoctorHomePc />
  if (portal === PORTAL.PATIENT) return <PatientHomePc />
  return <AdminHomePc />
}
