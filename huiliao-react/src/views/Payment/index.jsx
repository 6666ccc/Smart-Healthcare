import { useIsPc } from '../../hooks'
import PaymentMobile from './mobile'
import PaymentPc from './pc'

export default function Payment() {
  const isPc = useIsPc()
  return isPc ? <PaymentPc /> : <PaymentMobile />
}
