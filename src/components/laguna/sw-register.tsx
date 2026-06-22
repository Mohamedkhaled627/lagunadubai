'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register immediately (don't wait for load event in dev)
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)
        })
        .catch((err) => {
          console.log('[PWA] Service Worker registration failed:', err)
        })
    }

    // Handle install prompt (PWA install banner)
    let deferredPrompt: any = null
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('[PWA] Install prompt available')
    })

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully')
    })
  }, [])

  return null
}
