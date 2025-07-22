'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'
  const handleSwitch = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isDark}
        onCheckedChange={handleSwitch}
        aria-label="Toggle theme"
      />
      <span className="font-bold">{isDark ? 'Dark' : 'Light'}</span>
    </div>
  )
} 