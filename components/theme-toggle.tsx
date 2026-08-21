"use client"

import type React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === "dark"

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark"
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const supported = typeof document.startViewTransition === "function"

    // Circular reveal originating from the toggle button via the View Transition API.
    // Falls back to an instant swap when unsupported (e.g. Firefox) or motion is reduced.
    if (supported && !reducedMotion) {
      const root = document.documentElement
      root.style.setProperty("--theme-reveal-x", `${event.clientX}px`)
      root.style.setProperty("--theme-reveal-y", `${event.clientY}px`)

      document.startViewTransition(() => {
        flushSync(() => setTheme(next))
      })
    } else {
      setTheme(next)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={handleToggle}
      className="cursor-pointer"
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
