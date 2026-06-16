import { PcLayout } from '../../../layouts'

/**
 * Home 页专用 PcLayout 包装器
 *
 * 将 Home 页面使用的 `greetingSub` prop 映射为共享 PcLayout 的 `greeting` prop。
 * 所有其他 props（portal / pendingCount / lowStockCount / children 等）透传。
 */
export default function HomePcLayout({ greetingSub, ...props }) {
  return <PcLayout greeting={greetingSub} {...props} />
}
