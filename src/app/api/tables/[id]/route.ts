import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// GET /api/tables/[id]?by=qr|id  - public lookup by qrToken for customer menu
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const by = url.searchParams.get('by') || 'id'
  const table = by === 'qr'
    ? await db.table.findUnique({ where: { qrToken: id } })
    : await db.table.findUnique({ where: { id } })
  if (!table) return Response.json({ error: 'ترابيزة غير موجودة' }, { status: 404 })
  return Response.json({
    table: {
      id: table.id,
      name: table.name,
      number: table.number,
      qrToken: table.qrToken,
      seats: table.seats,
    },
  })
}
