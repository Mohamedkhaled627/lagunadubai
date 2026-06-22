import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/waiter-calls/serve - cashier marks a call as served
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { callId } = body

  if (!callId) return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })

  const calls = globalThis.__waiterCalls || []
  const call = calls.find((c: any) => c.id === callId)
  if (call) {
    call.status = 'served'
  }

  return Response.json({ ok: true })
}
