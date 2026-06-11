import { useEffect, useState } from 'react'
import UserMobile from './mobile'
import UserPc from './pc'

const PC_BREAKPOINT = 1024

function useIsPc() {
  const [isPc, setIsPc] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`)
    const handler = (event) => setIsPc(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isPc
}

export default function User() {
  const isPc = useIsPc()
  return isPc ? <UserPc /> : <UserMobile />
}
