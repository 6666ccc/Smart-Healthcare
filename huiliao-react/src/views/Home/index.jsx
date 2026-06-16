import { useIsPc } from '../../hooks'
import HomeMobile from './mobile'
import HomePc from './pc'

export default function Home() {
  const isPc = useIsPc()
  return isPc ? <HomePc /> : <HomeMobile />
}
