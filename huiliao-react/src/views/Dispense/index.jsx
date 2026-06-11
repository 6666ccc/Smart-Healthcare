import { useIsPc } from '../../hooks'
import DispensePc from './pc'
import DispenseMobile from './mobile'

export default function Dispense() {
  const isPc = useIsPc()
  return isPc ? <DispensePc /> : <DispenseMobile />
}
