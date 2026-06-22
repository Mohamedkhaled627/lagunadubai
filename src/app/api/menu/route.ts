import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  const url = new URL(req.url)
  const includeUnavailable = url.searchParams.get('include_unavailable') === '1'
  // Only admin can see unavailable items
  const showAll = includeUnavailable && user?.role === 'ADMIN'

  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: showAll ? {} : { available: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  return Response.json({ categories })
}
