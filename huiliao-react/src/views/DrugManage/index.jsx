import { useIsPc } from '../../hooks'
import DrugManagePc from './pc'
import DrugManageMobile from './mobile'

export default function DrugManage() {
  const isPc = useIsPc()
  return isPc ? <DrugManagePc /> : <DrugManageMobile />
}
