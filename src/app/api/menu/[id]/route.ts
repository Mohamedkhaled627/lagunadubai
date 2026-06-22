import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// PATCH /api/menu/[id]  - update price (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.price === 'number') data.price = body.price
  if (typeof body.available === 'boolean') data.available = body.available
  if (typeof body.name === 'string' && body.name) data.name = body.name
  if (typeof body.imageUrl === 'string') data.imageUrl = body.imageUrl || null

  const updated = await db.menuItem.update({ where: { id }, data })
  return Response.json({ item: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })
  if (user.role !== 'ADMIN') return Response.json({ error: 'صلاحيات الإدارة مطلوبة' }, { status: 403 })

  const { id } = await params
  await db.menuItem.update({ where: { id }, data: { available: false } })
  return Response.json({ ok: true })
}
