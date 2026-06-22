'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface WaiterCall {
  id: string
  tableName: string
  tableNumber: number
  message: string
  timestamp: number
  status: 'pending' | 'served'
}

// Hook for CASHIERS - polls for waiter calls every 3 seconds
// Uses HTTP polling via Next.js API (no CORS issues, works in all environments)
export function useWaiterCalls() {
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([])
  const [connected, setConnected] = useState(false)
  const knownCallIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    let pollTimer: any

    const poll = async () => {
      try {
        const r = await fetch('/api/waiter-calls', { credentials: 'include' })
        if (!r.ok) {
          if (mounted) setConnected(false)
          return
        }
        const d = await r.json()
        if (!mounted) return

        setConnected(true)
        const newCalls = d.calls || []

        // Detect NEW calls (not in knownCallIds) to play sound
        const trulyNew = newCalls.filter((c: WaiterCall) => !knownCallIds.current.has(c.id))
        if (trulyNew.length > 0 && knownCallIds.current.size > 0) {
          // Play sound for new calls (only after initial load)
          playCallSound()
        }

        // Update known calls
        newCalls.forEach((c: WaiterCall) => knownCallIds.current.add(c.id))
        // Clean up old served calls from known set
        const currentIds = new Set(newCalls.map((c: WaiterCall) => c.id))
        for (const id of Array.from(knownCallIds.current)) {
          if (!currentIds.has(id)) knownCallIds.current.delete(id)
        }

        setPendingCalls(newCalls)
      } catch {
        if (mounted) setConnected(false)
      }
    }

    // Initial poll
    poll()
    // Poll every 3 seconds
    pollTimer = setInterval(poll, 3000)

    return () => {
      mounted = false
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [])

  const serveCall = useCallback(async (callId: string) => {
    setPendingCalls((prev) => prev.filter((c) => c.id !== callId))
    try {
      await fetch('/api/waiter-calls/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
        credentials: 'include',
      })
    } catch {
      // ignore
    }
  }, [])

  return {
    pendingCalls,
    connected,
    callWaiter: () => {},
    serveCall,
  }
}

// Hook for CUSTOMERS - to call a waiter from a table (HTTP POST)
export function useCustomerCallWaiter() {
  const callWaiter = useCallback(async (tableName: string, tableNumber: number, message?: string) => {
    try {
      await fetch('/api/waiter-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, tableNumber, message }),
      })
    } catch {
      // ignore - the call still shows on customer side
    }
  }, [])

  return { callWaiter }
}

// Generate a pleasant notification chime using Web Audio API
function playCallSound() {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Play a 3-note chime (C5 - E5 - G5) - pleasant and attention-grabbing
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.15)
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.4)
    })

    setTimeout(() => ctx.close(), 1200)
  } catch {
    // Silent fail
  }
}
