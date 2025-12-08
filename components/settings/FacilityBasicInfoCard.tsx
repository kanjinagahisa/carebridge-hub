'use client'

import { useState, useEffect } from 'react'
import { Edit2, Check, X } from 'lucide-react'
import { FACILITY_TYPES, FACILITY_TYPE_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

interface Facility {
  id: string
  name: string
  type: string
  address?: string | null
  phone?: string | null
}

interface FacilityBasicInfoCardProps {
  facility: Facility
}

export default function FacilityBasicInfoCard({
  facility,
}: FacilityBasicInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: facility.name,
    type: facility.type,
    address: facility.address || '',
    phone: facility.phone || '',
  })

  useEffect(() => {
    setFormData({
      name: facility.name,
      type: facility.type,
      address: facility.address || '',
      phone: facility.phone || '',
    })
  }, [facility])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: facility.name,
      type: facility.type,
      address: facility.address || '',
      phone: facility.phone || '',
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      // セッションを確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('[FacilityBasicInfoCard] Session error:', sessionError)
        alert('セッションが無効です。再度ログインしてください。')
        window.location.href = '/login'
        return
      }

      console.log('[FacilityBasicInfoCard] handleSave called')
      console.log('[FacilityBasicInfoCard] Updating facility:', {
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
      })

      const { data, error } = await supabase
        .from('facilities')
        .update({
          name: formData.name.trim(),
          type: formData.type,
          address: formData.address.trim() || null,
          phone: formData.phone.trim() || null,
        })
        .eq('id', facility.id)
        .select()
        .single()

      if (error) {
        console.error('[FacilityBasicInfoCard] Update error:', error)
        throw error
      }

      console.log('[FacilityBasicInfoCard] Facility updated successfully.')
      console.log('[FacilityBasicInfoCard] Reloading page...')

      // 保存成功後、ページをリロードして最新データを表示
      setIsEditing(false)
      // 少し待機してからリロード（セッションが確立されるまで）
      await new Promise((resolve) => setTimeout(resolve, 100))
      window.location.reload()
    } catch (error: any) {
      console.error('[FacilityBasicInfoCard] Failed to update facility:', error)
      
      // RLSエラーの場合、より分かりやすいメッセージを表示
      if (error?.code === '42501' || error?.message?.includes('permission')) {
        alert('権限がありません。管理者のみ施設情報を更新できます。')
      } else {
        alert('更新に失敗しました。もう一度お試しください。')
      }
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">施設基本情報</h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full transition-colors"
            aria-label="編集"
          >
            <Edit2 size={18} />
          </button>
        )}
      </div>

      {isEditing ? (
        <>
          <div className="space-y-3 text-sm">
            <div>
              <label htmlFor="name" className="block text-gray-500 mb-1">
                施設名
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-gray-500 mb-1">
                種別
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
              >
                {Object.entries(FACILITY_TYPES).map(([key, value]) => (
                  <option key={key} value={value}>
                    {FACILITY_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="address" className="block text-gray-500 mb-1">
                住所
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-gray-500 mb-1">
                電話番号
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="text-gray-500 w-24">施設名:</span>
            <span className="text-gray-900 flex-1">{facility.name}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24">種別:</span>
            <span className="text-gray-900 flex-1">
              {FACILITY_TYPE_LABELS[facility.type] || facility.type}
            </span>
          </div>
          {facility.address && (
            <div className="flex">
              <span className="text-gray-500 w-24">住所:</span>
              <span className="text-gray-900 flex-1">{facility.address}</span>
            </div>
          )}
          {facility.phone && (
            <div className="flex">
              <span className="text-gray-500 w-24">電話番号:</span>
              <span className="text-gray-900 flex-1">{facility.phone}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


