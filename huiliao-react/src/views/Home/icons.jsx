export function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
    </svg>
  )
}

export function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  )
}

export function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  )
}

export function IconHeadset() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" />
      <rect x="2" y="14" width="5" height="6" rx="2" />
      <rect x="17" y="14" width="5" height="6" rx="2" />
    </svg>
  )
}

export function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3l1.2 4.2L17 8.5l-3.8 1.3L12 14l-1.2-4.2L7 8.5l3.8-1.3L12 3z" strokeLinejoin="round" />
      <path d="M5 16l.8 2.8L8.5 20l-2.7.9L5 23l-.8-2.8L1.5 20l2.7-.9L5 16z" strokeLinejoin="round" />
      <path d="M19 14l.6 2.1L21.5 17l-2.1.7L19 20l-.6-2.1L16.5 17l2.1-.7L19 14z" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 4v16M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2.2-1.8 4-4 4s-4-1.8-4-4z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 20c6-1 10-5 12-12-7 2-11 6-12 12z" strokeLinejoin="round" />
      <path d="M8 16l4-4" strokeLinecap="round" />
    </svg>
  )
}

export function ServiceIcon({ name }) {
  const icons = {
    'calendar-plus': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" strokeLinecap="round" />
      </svg>
    ),
    stethoscope: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M6 4v6a6 6 0 0 0 12 0V4M6 4h4M14 4h4" strokeLinecap="round" />
        <circle cx="18" cy="18" r="3" />
        <path d="M18 15v-1" strokeLinecap="round" />
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M3 7V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1M17 13h4" strokeLinecap="round" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V6l8-4 8 4v14H4z" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" strokeLinecap="round" />
      </svg>
    ),
    report: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    ),
    folder: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
        <path d="M4 7l2-3h6l2 3" strokeLinejoin="round" />
      </svg>
    ),
    dispense: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        <path d="M12 2v4" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[name] || null
}

export function StatIcon({ theme }) {
  const icons = {
    blue: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
    green: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M17 13h4" strokeLinecap="round" />
      </svg>
    ),
    orange: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    ),
    purple: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3l7 4v6c0 4.5-3.1 8.7-7 10-3.9-1.3-7-5.5-7-10V7l7-4z" strokeLinejoin="round" />
        <path d="M12 8v8M9 11h6" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[theme]
}

export function NavIcon({ name }) {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M17 13h4" strokeLinecap="round" />
      </svg>
    ),
    report: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    ),
    folder: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
        <path d="M4 7l2-3h6l2 3" strokeLinejoin="round" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V6l8-4 8 4v14H4z" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" strokeLinecap="round" />
      </svg>
    ),
    message: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 6h16v10a2 2 0 0 1-2 2H8l-4 4V6z" strokeLinejoin="round" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
      </svg>
    ),
    dispense: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        <path d="M12 2v4" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[name]
}

export function TabIcon({ name, active }) {
  const stroke = active ? 2 : 1.75
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M17 13h4" strokeLinecap="round" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
        <path d="M4 20V6l8-4 8 4v14H4z" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[name]
}

export function HealthIllustration() {
  return (
    <svg className="home-tip-illus" viewBox="0 0 120 100" fill="none" aria-hidden>
      <circle cx="75" cy="45" r="28" fill="rgba(110, 143, 179, 0.15)" />
      <path d="M75 28v34M63 40h24" stroke="#6e8fb3" strokeWidth="3" strokeLinecap="round" />
      <rect x="28" y="35" width="36" height="48" rx="6" fill="rgba(127, 167, 163, 0.2)" stroke="#7fa7a3" strokeWidth="1.5" />
      <path d="M36 50h20M36 58h14M36 66h18" stroke="#7fa7a3" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 45l4 4 8-8" stroke="#6e8fb3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShieldIllustration() {
  return (
    <svg className="home-pc-tip-illus" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="88" cy="78" rx="28" ry="8" fill="rgba(110, 143, 179, 0.12)" />
      <path d="M60 18l28 12v22c0 18-12 32-28 38-16-6-28-20-28-38V30l28-12z" fill="rgba(110, 143, 179, 0.18)" stroke="#6e8fb3" strokeWidth="1.5" />
      <path d="M60 36v22M49 47h22" stroke="#6e8fb3" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 58c4-8 10-14 18-18" stroke="#7fa7a3" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="34" cy="58" r="3" fill="#7fa7a3" />
      <path d="M92 34c-3 6-8 11-14 14" stroke="#7fa7a3" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="92" cy="34" r="3" fill="#7fa7a3" />
    </svg>
  )
}

export function GreetingBg() {
  return (
    <svg className="home-pc-greeting-bg" viewBox="0 0 800 120" fill="none" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <path d="M520 20h180v80H520z" fill="rgba(110,143,179,0.06)" rx="8" />
      <path d="M560 40h40v40h-40z" fill="rgba(127,167,163,0.08)" />
      <path d="M620 50h80v8H620z" fill="rgba(110,143,179,0.08)" />
      <path d="M620 68h60v8H620z" fill="rgba(110,143,179,0.06)" />
      <rect x="680" y="30" width="50" height="60" rx="6" fill="rgba(127,167,163,0.1)" />
      <path d="M700 50h10v30h-10zM715 45h10v35h-10z" fill="rgba(110,143,179,0.12)" />
    </svg>
  )
}
