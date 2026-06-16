import { useIsPc } from '../../hooks'
import ConsultationMobile from './mobile'
import ConsultationPc from './pc'

export default function Consultation() {
  const isPc = useIsPc()
  return isPc ? <ConsultationPc /> : <ConsultationMobile />
}
