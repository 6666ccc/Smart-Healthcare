import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IconCalendar } from '../views/shared'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(iso) {
  const date = parseISO(iso)
  if (!date) return '选择日期'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function CalendarIcon() {
  return <IconCalendar size={16} strokeWidth={1.5} className="view-date-picker__icon" />
}

/** 主题统一的日期选择器 */
export function DatePicker({ value, onChange, min, className = '', disabled = false, allowClear = true }) {
  const [open, setOpen] = useState(false)
  const selected = parseISO(value)
  const minDate = min ? parseISO(min) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(() => (selected || today).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (selected || today).getMonth())

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const [popoverStyle, setPopoverStyle] = useState(null)

  const updatePopoverPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewportH = window.innerHeight
    const popoverH = 320
    const below = rect.bottom + 6
    const fitsBelow = below + popoverH <= viewportH - 8
    setPopoverStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 1100,
      ...(fitsBelow
        ? { top: below }
        : { bottom: viewportH - rect.top + 6 }),
    })
  }, [])

  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      setPopoverStyle(null)
      return
    }
    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open, updatePopoverPosition, viewYear, viewMonth])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      const inTrigger = containerRef.current?.contains(e.target)
      const inPopover = popoverRef.current?.contains(e.target)
      if (!inTrigger && !inPopover) setOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11 }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0 }
      return m + 1
    })
  }, [])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const cells = []

  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isDisabled = (day) => {
    if (!day) return true
    const date = new Date(viewYear, viewMonth, day)
    date.setHours(0, 0, 0, 0)
    if (minDate && date < minDate) return true
    return false
  }

  const pickDay = (day) => {
    if (isDisabled(day)) return
    const date = new Date(viewYear, viewMonth, day)
    onChange(toISO(date))
    setOpen(false)
  }

  const pickToday = () => {
    if (minDate && today < minDate) return
    onChange(toISO(today))
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setOpen(false)
  }

  const popover = open && popoverStyle ? (
    <div
      ref={popoverRef}
      className="view-date-picker__popover"
      style={popoverStyle}
      role="dialog"
      aria-label="选择日期"
    >
      <div className="view-date-picker__header">
        <button type="button" className="view-date-picker__nav" onClick={prevMonth} aria-label="上个月">
          ‹
        </button>
        <span className="view-date-picker__title">
          {viewYear}年{String(viewMonth + 1).padStart(2, '0')}月
        </span>
        <button type="button" className="view-date-picker__nav" onClick={nextMonth} aria-label="下个月">
          ›
        </button>
      </div>

      <div className="view-date-picker__weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w} className="view-date-picker__weekday">{w}</span>
        ))}
      </div>

      <div className="view-date-picker__grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} className="view-date-picker__day view-date-picker__day--empty" aria-hidden="true" />
          const date = new Date(viewYear, viewMonth, day)
          const disabledDay = isDisabled(day)
          const isSelected = selected && isSameDay(date, selected)
          const isToday = isSameDay(date, today)
          return (
            <button
              key={`${viewYear}-${viewMonth}-${day}`}
              type="button"
              className={[
                'view-date-picker__day',
                isSelected && 'view-date-picker__day--selected',
                isToday && !isSelected && 'view-date-picker__day--today',
                disabledDay && 'view-date-picker__day--disabled',
              ].filter(Boolean).join(' ')}
              onClick={() => pickDay(day)}
              disabled={disabledDay}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="view-date-picker__footer">
        {allowClear && (
          <button type="button" className="view-date-picker__footer-btn" onClick={() => { onChange(''); setOpen(false) }}>
            清除
          </button>
        )}
        <button
          type="button"
          className={`view-date-picker__footer-btn view-date-picker__footer-btn--accent${allowClear ? '' : ' view-date-picker__footer-btn--solo'}`}
          onClick={pickToday}
        >
          今天
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className={`view-date-picker${open ? ' view-date-picker--open' : ''}${className ? ` ${className}` : ''}`} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className="view-date-picker__trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="view-date-picker__value">{formatDisplay(value)}</span>
        <CalendarIcon />
      </button>

      {popover && createPortal(popover, document.body)}
    </div>
  )
}
