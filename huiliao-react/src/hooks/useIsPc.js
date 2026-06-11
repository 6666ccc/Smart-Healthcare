import { useEffect, useState } from 'react'

const PC_BREAKPOINT = 1024

/**
 * 响应式断点检测：>=1024px 为 PC 端，否则为移动端
 * 替代各视图中重复定义的 useIsPc
 */
export function useIsPc() {
  const [isPc, setIsPc] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PC_BREAKPOINT}px)`)
    const handler = (e) => setIsPc(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isPc
}
