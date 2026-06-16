import { useMemo } from 'react'

/**
 * 骨架屏占位组件 — 替代所有"加载中…"文字
 *
 * @param {'text'|'heading'|'card'} [props.variant='text']  变体
 * @param {number} [props.count=1]                           重复行数
 * @param {string} [props.width]                             自定义宽度
 * @param {string} [props.className]                         额外 class
 */
export default function Skeleton({ variant = 'text', count = 1, width, className = '' }) {
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => i),
    [count]
  )
  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`skeleton skeleton--${variant} ${className}`.trim()}
          style={width ? { width } : undefined}
        />
      ))}
    </>
  )
}
