import { useState, useEffect } from 'react'

/** 响应式断点检测 >=1024px 为 PC */
export function useIsPc() {
  const [isPc, setIsPc] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setIsPc(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isPc
}
