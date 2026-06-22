import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const settings = await db.setting.findMany()
  const map: Record<string, string> = {}
  for (const s of settings) map[s.key] = s.value
  return Response.json({ settings: map })
}

// POST - update settings
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  for (const [key, value] of Object.entries(body)) {
    await db.setting.upsert({
      where: { key },
      create: { id: key.toLowerCase(), key, value: String(value) },
      update: { value: String(value) },
    })
  }
  return Response.json({ ok: true })
}
