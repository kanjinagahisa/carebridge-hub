'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Check } from 'lucide-react'

interface Facility {
  facility_id: string
  name: string
  role: string
  isCurrent: boolean
}

interface FacilitySwitcherProps {
  facilities: Facility[]
  currentUserId: string
  onSwitchSuccess?: () => void
}

/**
 * 施設切り替えコンポーネント
 * 
 * 設計方針:
 * - users.current_facility_id を更新することで施設を切り替え
 * - 成功したらクライアント側状態も更新（onSwitchSuccess コールバック）
 * - 失敗時はトースト等で通知
 */
export default function FacilitySwitcher({
  facilities,
  currentUserId,
  onSwitchSuccess,
}: FacilitySwitcherProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSwitch = async (facilityId: string) => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // users.current_facility_id を更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ current_facility_id: facilityId })
        .eq('id', currentUserId)

      if (updateError) {
        console.error('[FacilitySwitcher] Error updating current_facility_id', {
          error: updateError.message,
          code: updateError.code,
        })
        setError('施設の切り替えに失敗しました。もう一度お試しください。')
        return
      }

      console.log('[FacilitySwitcher] Facility switched successfully', {
        userId: currentUserId,
        facilityId,
      })

      // 成功したらコールバックを実行（ページリロード等）
      if (onSwitchSuccess) {
        onSwitchSuccess()
      } else {
        // デフォルト動作: ページをリロード
        window.location.reload()
      }
    } catch (err: any) {
      console.error('[FacilitySwitcher] Unexpected error', {
        error: err?.message,
        stack: err?.stack,
      })
      setError('予期しないエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  if (facilities.length <= 1) {
    // 施設が1つ以下の場合は表示しない
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building2 size={20} className="text-gray-600" />
          施設を切り替える
        </h3>
      </div>
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {facilities.map((facility) => (
          <button
            key={facility.facility_id}
            onClick={() => handleSwitch(facility.facility_id)}
            disabled={isLoading || facility.isCurrent}
            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
              facility.isCurrent
                ? 'bg-blue-50 cursor-default'
                : isLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">{facility.name}</p>
              <p className="text-sm text-gray-500">{facility.role}</p>
            </div>
            {facility.isCurrent && (
              <Check size={20} className="text-blue-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}


