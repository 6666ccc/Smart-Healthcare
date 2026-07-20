/**
 * 温润诊所 — 统一图标（基于 Lucide）
 * https://lucide.dev
 */
import {
  Leaf,
  CalendarDays,
  Building2,
  Wallet,
  ClipboardList,
  Sparkles,
  User,
  Search,
  Home,
  LogOut,
  Users,
  Hourglass,
  Inbox,
} from 'lucide-react'

const STROKE = 1.75

function wrap(Icon, defaultSize = 24) {
  return function WrappedIcon({ size = defaultSize, color = 'currentColor', strokeWidth = STROKE, ...props }) {
    return <Icon size={size} color={color} strokeWidth={strokeWidth} aria-hidden {...props} />
  }
}

export const IconLogo = wrap(Leaf, 28)
export const IconCalendar = wrap(CalendarDays)
export const IconHospital = wrap(Building2)
export const IconWallet = wrap(Wallet)
export const IconRecord = wrap(ClipboardList)
export const IconAI = wrap(Sparkles)
export const IconUser = wrap(User)
export const IconSearch = wrap(Search, 18)
export const IconHome = wrap(Home, 20)
export const IconLogout = wrap(LogOut, 20)
export const IconQueue = wrap(Users, 20)
export const IconHourglass = wrap(Hourglass)
export const IconEmpty = wrap(Inbox)
