import { useEffect, useState } from 'react'

type Mode = 'light' | 'dark'
const KEY = 'theme'

function applyTheme(mode: Mode) {
  document.documentElement.setAttribute('data-theme', mode)
  document.documentElement.style.colorScheme = mode
  localStorage.setItem(KEY, mode)
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light')

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Mode | null
    const initial: Mode = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setMode(initial)
    applyTheme(initial)
  }, [])

  function toggle() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      className="theme-fab"
      aria-label="Toggle theme"
      title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
      onClick={toggle}
    >
      {mode === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
