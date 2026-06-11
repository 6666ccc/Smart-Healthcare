import { useAuth } from '../../../store'
import { getPortalType, PORTAL } from '../role'
import AdminHomeMobile from './AdminHome'
import DoctorHomeMobile from './DoctorHome'
import PatientHomeMobile from './PatientHome'

export default function HomeMobile() {
  const { user } = useAuth()
  const portal = getPortalType(user)

  if (portal === PORTAL.DOCTOR) return <DoctorHomeMobile />
  if (portal === PORTAL.PATIENT) return <PatientHomeMobile />
  return <AdminHomeMobile />
}
