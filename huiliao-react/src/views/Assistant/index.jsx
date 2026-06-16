import { useIsPc } from '../../hooks'
import AssistantMobile from './mobile'
import AssistantPc from './pc'

export default function Assistant() {
  const isPc = useIsPc()
  return isPc ? <AssistantPc /> : <AssistantMobile />
}
