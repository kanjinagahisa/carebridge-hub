'use client'

import { useState, useEffect } from 'react'

interface EditableTextAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
}

/**
 * 編集可能なテキストエリアコンポーネント
 */
export default function EditableTextArea({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 6,
  disabled = false,
}: EditableTextAreaProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${className}`}
    />
  )
}








