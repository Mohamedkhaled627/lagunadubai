'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/card'

export function Logo({ size = 64, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-white shadow-lg ring-2 ring-ocean/20"
        style={{ width: size, height: size }}
      >
        <Image
          src="/laguna-logo.png"
          alt="لاجونا كافيه"
          fill
          className="object-cover"
          sizes={`${size}px`}
          priority
        />
      </div>
      {withText && (
        <div className="flex flex-col">
          <span className="text-2xl font-extrabold text-ocean">لاجونا</span>
          <span className="text-xs text-muted-foreground -mt-1">كافيه · على البحر</span>
        </div>
      )}
    </div>
  )
}

export function WaveDivider() {
  return (
    <svg
      className="w-full h-8 text-lagoon/30"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      fill="currentColor"
      aria-hidden
    >
      <path d="M0,40 C240,80 480,0 720,32 C960,64 1200,16 1440,48 L1440,80 L0,80 Z" />
    </svg>
  )
}
