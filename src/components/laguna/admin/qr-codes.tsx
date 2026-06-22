'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Table2, Printer, Copy, Check, Eye } from 'lucide-react'

interface TableInfo {
  id: string
  name: string
  number: number
  qrToken: string
  seats: number
  hasOpenOrder: boolean
}

export function QRCodesView() {
  const { toast } = useToast()
  const [tables, setTables] = useState<TableInfo[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    api<{ tables: TableInfo[] }>('/api/tables').then((d) => setTables(d.tables))
  }, [])

  // Use a state to track client-side mount so window.location.origin is stable after hydration
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])
  const origin = mounted ? window.location.origin : ''
  const menuUrl = (token: string) => `${origin}/?view=menu&table=${token}`

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(menuUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 1500)
    toast({ title: 'تم نسخ الرابط' })
  }

  const previewMenu = (token: string) => {
    window.open(menuUrl(token), '_blank')
  }

  const printAll = () => {
    window.print()
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <div>
          <h1 className="text-2xl font-bold text-ocean flex items-center gap-2">
            <QrCode className="w-6 h-6" /> أكواد QR للترابيزات
          </h1>
          <p className="text-sm text-muted-foreground">{tables.length} ترابيزة · اطبع الكود وضعه على كل ترابيزة</p>
        </div>
        <Button onClick={printAll} variant="outline" className="no-print">
          <Printer className="w-4 h-4 ml-1" /> طباعة الكل
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardContent className="p-4 flex flex-col items-center text-center no-print">
              <div className="flex items-center gap-2 mb-2 w-full">
                <Table2 className="w-4 h-4 text-ocean" />
                <span className="font-bold flex-1 text-right">{t.name}</span>
                <Badge variant="outline" className="text-xs">{t.seats} مقاعد</Badge>
              </div>
              <div className="bg-white p-3 rounded-xl border-2 border-ocean/20 my-2">
                <QRCodeSVG
                  value={menuUrl(t.qrToken)}
                  size={140}
                  level="M"
                  fgColor="#0d4a5c"
                  bgColor="#ffffff"
                  marginSize={0}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-2">امسح الكود لعرض المنيو</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => copyUrl(t.qrToken)}
                >
                  {copied === t.qrToken ? <Check className="w-3 h-3 ml-1 text-green-600" /> : <Copy className="w-3 h-3 ml-1" />}
                  نسخ
                </Button>
                <Button
                  size="sm"
                  className="text-xs laguna-gradient text-white border-0"
                  onClick={() => previewMenu(t.qrToken)}
                >
                  <Eye className="w-3 h-3 ml-1" />
                  معاينة
                </Button>
              </div>
            </CardContent>
            {/* Printable version */}
            <div className="hidden print:block p-6 text-center">
              <h2 className="text-2xl font-bold mb-1">لاجونا كافيه</h2>
              <p className="text-sm mb-2">{t.name}</p>
              <div className="inline-block p-2 border-2 border-black">
                <QRCodeSVG
                  value={menuUrl(t.qrToken)}
                  size={180}
                  level="M"
                  fgColor="#000"
                  bgColor="#fff"
                  marginSize={0}
                />
              </div>
              <p className="text-xs mt-2">امسح الكود لعرض المنيو</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="no-print">
        <CardContent className="p-4">
          <h2 className="font-bold text-ocean mb-2">طريقة الاستخدام</h2>
          <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
            <li>اطبع أكواد QR لكل ترابيزة باستخدام زر "طباعة الكل" أعلى الصفحة</li>
            <li>الصق كل كود على الترابيزة المقابلة له (مثال: كود "ترابيزة 1" يُلصق على الترابيزة الأولى)</li>
            <li>العميل يفتح كاميرا الجوال ويمسح الكود</li>
            <li>تفتح صفحة المنيو تلقائياً مع عرض اسم الترابيزة وأصناف المنيو بالصور</li>
            <li>يمكن للعميل تصفح المنيو والإضافة للمفضلة واستدعاء الويتر</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
