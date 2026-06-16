import { useIsPc } from '../../hooks'
import RegistrationMobile from './mobile'
import RegistrationPc from './pc'

export default function Registration() {
  const isPc = useIsPc()
  return isPc ? <RegistrationPc /> : <RegistrationMobile />
}
