import { useIsPc } from '../../hooks'
import DepartmentMobile from './mobile'
import DepartmentPc from './pc'

export default function Department() {
  const isPc = useIsPc()
  return isPc ? <DepartmentPc /> : <DepartmentMobile />
}
