import { useIsPc } from '../../hooks'
import PatientListPc from './pc'
import PatientListMobile from './mobile'

export default function PatientList() {
  const isPc = useIsPc()
  return isPc ? <PatientListPc /> : <PatientListMobile />
}
