'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api } from '../use-auth'
import { Settings as SettingsIcon, Save } from 'lucide-react'

export function SettingsView() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<{ settings: Record<string, string> }>('/api/settings').then((d) => setSettings(d.settings))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api('/api/settings', { method: 'POST', body: JSON.stringify(settings) })
      toast({ title: 'تم حفظ الإعدادات' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const set = (k: string, v: string) => setSettings((s) => ({ ...s, [k]: v }))

  return (
    <div className="p-4 space-y-3 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ocean flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> الإعدادات
        </h1>
        <p className="text-sm text-muted-foreground">بيانات الكافيه والإعدادات العامة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الكافيه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>اسم الكافيه</Label>
            <Input value={settings.CAFE_NAME || ''} onChange={(e) => set('CAFE_NAME', e.target.value)} />
          </div>
          <div>
            <Label>العنوان</Label>
            <Input value={settings.CAFE_ADDRESS || ''} onChange={(e) => set('CAFE_ADDRESS', e.target.value)} />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input value={settings.CAFE_PHONE || ''} onChange={(e) => set('CAFE_PHONE', e.target.value)} className="num" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الضرائب والرسوم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>نسبة الضريبة الافتراضية %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={settings.TAX_RATE || '0'}
              onChange={(e) => set('TAX_RATE', e.target.value)}
              className="num"
            />
            <p className="text-xs text-muted-foreground mt-1">ستظهر كقيمة افتراضية في كل فاتورة جديدة - يمكن للكاشير تعديلها لكل فاتورة</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حسابات الدخول</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
              <span className="font-mono">admin / admin123</span>
              <span className="text-xs text-muted-foreground">مدير النظام</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
              <span className="font-mono">cashier1 / cash123</span>
              <span className="text-xs text-muted-foreground">كاشير 1</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
              <span className="font-mono">cashier2 / cash123</span>
              <span className="text-xs text-muted-foreground">كاشير 2</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              لتغيير كلمات المرور، تواصل مع مطور النظام. يمكن إضافة مستخدمين جدد من قاعدة البيانات مباشرة.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="laguna-gradient text-white border-0 w-full">
        <Save className="w-4 h-4 ml-2" />
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </div>
  )
}
