'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'

interface ClientOnlyDateProps {
  /** ISO日付文字列（例: 2025-01-25T03:33:00.000Z） */
  dateString: string
  /** フォーマット（デフォルト: MM/dd HH:mm） */
  formatStr?: string
  /** マウント前のプレースホルダ（SSR/CSR一致用、デフォルト: —） */
  placeholder?: string
  className?: string
}

/**
 * ハイドレーション不一致を防ぐため、クライアントマウント後にのみ日付を描画する。
 * SSR時はプレースホルダ（—）を表示し、マウント後に format して表示する。
 */
export function ClientOnlyDate({
  dateString,
  formatStr = 'MM/dd HH:mm',
  placeholder = '—',
  className,
}: ClientOnlyDateProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className={className}>{placeholder}</span>
  }

  try {
    const formatted = format(new Date(dateString), formatStr, { locale: ja })
    return <span className={className}>{formatted}</span>
  } catch {
    return <span className={className}>{placeholder}</span>
  }
}
