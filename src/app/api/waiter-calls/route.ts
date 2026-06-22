import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// In-memory store for waiter calls (reset on server restart)
// In production, you'd use Redis or a database table
globalThis.__waiterCalls = globalThis.__waiterCalls || []
const calls = globalThis.__waiterCalls

// GET /api/waiter-calls - cashier polls for pending calls
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  // Return pending calls (not served yet)
  const pending = calls.filter((c: any) => c.status === 'pending')
  return Response.json({ calls: pending })
}

// POST /api/waiter-calls - customer calls a waiter from a table
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { tableName, tableNumber, message } = body

  if (!tableName || !tableNumber) {
    return Response.json({ error: 'الترابيزة مطلوبة' }, { status: 400 })
  }

  const call = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tableName,
    tableNumber,
    message: message || `العميل في ${tableName} بيستدعيك`,
    timestamp: Date.now(),
    status: 'pending' as const,
  }

  calls.unshift(call)
  if (calls.length > 50) calls.pop()

  console.log(`[WAITER CALL] ${call.tableName} (${call.tableNumber}): ${call.message}`)

  return Response.json({ ok: true, call })
}
