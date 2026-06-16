import { useIsPc } from '../../hooks'
import UserMobile from './mobile'
import UserPc from './pc'

export default function User() {
  const isPc = useIsPc()
  return isPc ? <UserPc /> : <UserMobile />
}
