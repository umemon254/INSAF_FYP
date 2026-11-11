'use client'
import { useEffect } from 'react'

// puts the saved theme (light or dark) on the page when any page opens
export default function ThemeLoader() {
  useEffect(() => {
    try {
      if (localStorage.getItem('insaf-theme') === 'dark') document.documentElement.dataset.theme = 'dark'
    } catch {}
  }, [])
  return null
}
