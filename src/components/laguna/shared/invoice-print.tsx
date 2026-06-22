'use client'

import { fmtMoney, fmtDate, fmtTime, fmtDateTime } from '@/lib/format'

interface InvoiceItem {
  id: string
  name: string
  price: number
  quantity: number
  total: number
}
interface Order {
  id: string
  invoiceNumber: number
  status: string
  paymentMethod: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discountRate: number
  discountAmount: number
  total: number
  notes: string | null
  createdAt: string
  paidAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  table: { name: string; number: number } | null
  cashier: { name: string; username: string }
  items: InvoiceItem[]
  returns?: { id: string; totalRefund: number; items: any[]; reason: string }[]
}

export function InvoicePrint({
  order,
  cafeName = 'لاجونا كافيه',
  cafeAddress = 'الكورنيش - على البحر مباشرة',
  cafePhone = '01000000000',
}: {
  order: Order
  cafeName?: string
  cafeAddress?: string
  cafePhone?: string
}) {
  const paymentLabel = (m: string | null) => {
    if (!m) return '-'
    if (m === 'CASH') return 'كاش'
    if (m === 'VISA') return 'فيزا'
    if (m === 'MASTER') return 'ماستركارد'
    if (m === 'ONLINE') return 'دفع إلكتروني'
    return m
  }
  const statusLabel = (s: string) => {
    if (s === 'PAID') return 'مدفوعة'
    if (s === 'CANCELLED') return 'ملغية'
    if (s === 'PENDING') return 'معلقة'
    return s
  }

  return (
    <div className="bg-white text-black font-mono" dir="rtl" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          { }
          <img src="/laguna-logo.png" alt="logo" className="w-12 h-12 object-contain" />
          <h1 className="text-2xl font-extrabold tracking-wide">{cafeName}</h1>
        </div>
        <p className="text-xs text-gray-600">{cafeAddress}</p>
        <p className="text-xs text-gray-600 num" dir="ltr">tel: {cafePhone}</p>
      </div>

      {/* Meta */}
      <div className="space-y-0.5 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-gray-600">رقم الفاتورة:</span>
          <span className="font-bold num">#{order.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">التاريخ:</span>
          <span className="num">{fmtDate(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الوقت:</span>
          <span className="num">{fmtTime(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الكاشير:</span>
          <span className="font-semibold">{order.cashier.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الترابيزة:</span>
          <span className="font-semibold">{order.table?.name || 'تيك أواي'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">طريقة الدفع:</span>
          <span className="font-semibold">{paymentLabel(order.paymentMethod)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الحالة:</span>
          <span className={`font-bold ${order.status === 'PAID' ? 'text-green-700' : order.status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600'}`}>
            {statusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="border-t-2 border-dashed border-gray-300 pt-2 mb-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs font-bold pb-1 border-b border-gray-300">
          <span>الصنف</span>
          <span className="w-8 text-center">كمية</span>
          <span className="w-16 text-left">السعر</span>
        </div>
        {order.items.map((it) => (
          <div key={it.id} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs py-0.5 border-b border-dotted border-gray-200">
            <span className="font-medium">{it.name}</span>
            <span className="w-8 text-center num">{it.quantity}</span>
            <span className="w-16 text-left num">{it.total.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-0.5 text-xs mb-3 border-t-2 border-dashed border-gray-300 pt-2">
        <div className="flex justify-between">
          <span>الإجمالي الفرعي:</span>
          <span className="num">{fmtMoney(order.subtotal)}</span>
        </div>
        {order.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>ضريبة ({order.taxRate}%):</span>
            <span className="num">{fmtMoney(order.taxAmount)}</span>
          </div>
        )}
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>خصم ({order.discountRate}%):</span>
            <span className="num">- {fmtMoney(order.discountAmount)}</span>
          </div>
        )}
        {order.returns && order.returns.length > 0 && (
          <div className="flex justify-between text-red-600">
            <span>مرتجع:</span>
            <span className="num">- {fmtMoney(order.returns.reduce((s, r) => s + r.totalRefund, 0))}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-extrabold pt-1 border-t border-gray-400 mt-1">
          <span>الإجمالي النهائي:</span>
          <span className="num">{fmtMoney(order.total)}</span>
        </div>
      </div>

      {order.notes && (
        <div className="text-xs mb-3 p-2 bg-gray-100 rounded">
          <span className="font-semibold">ملاحظات: </span>
          {order.notes}
        </div>
      )}

      {order.status === 'CANCELLED' && order.cancelReason && (
        <div className="text-xs mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700">
          <span className="font-semibold">سبب الإلغاء: </span>
          {order.cancelReason}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs pt-3 border-t-2 border-dashed border-gray-300">
        <p className="font-semibold mb-1">شكراً لزيارتكم 🌊</p>
        <p className="text-gray-600">نتمنى لكم وقتاً سعيداً على البحر</p>
        <p className="text-gray-500 mt-2 text-[10px]">لاجونا كافيه · {fmtDate(order.createdAt)}</p>
      </div>
    </div>
  )
}
