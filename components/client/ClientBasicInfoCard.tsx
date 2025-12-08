'use client'

import { useState, useEffect } from 'react'
import { Edit2, X, Check } from 'lucide-react'
import type { Client } from '@/types/carebridge'
import { updateClient } from '@/lib/api/clients'
import { calculateAge, formatDate } from '@/lib/utils/client'
import { canEditClient } from '@/lib/utils/auth'

interface ClientBasicInfoCardProps {
  client: Client
  onUpdate: (updatedClient: Client) => void
}

/**
 * 基本情報カードコンポーネント
 * 編集機能付き（admin/staffのみ）
 */
export default function ClientBasicInfoCard({
  client,
  onUpdate,
}: ClientBasicInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [formData, setFormData] = useState({
    name: client.name,
    kana: client.kana || '',
    date_of_birth: client.date_of_birth || '',
  })

  // 編集権限をチェック
  useEffect(() => {
    canEditClient(client.facility_id).then((hasPermission) => {
      setCanEdit(hasPermission)
    })
  }, [client.facility_id])

  const age = calculateAge(formData.date_of_birth)
  const formattedDate = formatDate(formData.date_of_birth)

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({
      name: client.name,
      kana: client.kana || '',
      date_of_birth: client.date_of_birth || '',
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: client.name,
      kana: client.kana || '',
      date_of_birth: client.date_of_birth || '',
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateClient(client.id, {
        name: formData.name.trim(),
        kana: formData.kana.trim() || null,
        date_of_birth: formData.date_of_birth.trim() || null,
      })

      const updatedClient: Client = {
        ...client,
        name: formData.name.trim(),
        kana: formData.kana.trim() || null,
        date_of_birth: formData.date_of_birth.trim() || null,
      }

      onUpdate(updatedClient)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update client:', error)
      alert('更新に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">基本情報</h2>
        {canEdit && !isEditing && (
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="編集"
          >
            <Edit2 size={18} className="text-gray-600" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* 氏名 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">氏名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="利用者名"
            />
          </div>

          {/* カナ */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">カナ</label>
            <input
              type="text"
              value={formData.kana}
              onChange={(e) => setFormData({ ...formData, kana: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="フリガナ"
            />
          </div>

          {/* 生年月日 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">生年月日</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) =>
                setFormData({ ...formData, date_of_birth: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                '保存中...'
              ) : (
                <>
                  <Check size={16} />
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-slate-600">氏名</span>
            <p className="text-slate-800 mt-1">{client.name}</p>
          </div>
          {client.kana && (
            <div>
              <span className="text-sm text-slate-600">カナ</span>
              <p className="text-slate-800 mt-1">{client.kana}</p>
            </div>
          )}
          {client.date_of_birth && (
            <div>
              <span className="text-sm text-slate-600">生年月日</span>
              <p className="text-slate-800 mt-1">
                {formattedDate}
                {age !== null && `（${age}歳）`}
              </p>
            </div>
          )}
          {client.memo && (
            <div className="pt-3 border-t border-gray-200">
              <span className="text-sm text-slate-600">メモのサマリー</span>
              <p className="text-slate-800 mt-1 text-sm line-clamp-2">
                {client.memo.length > 50
                  ? `${client.memo.substring(0, 50)}...`
                  : client.memo}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

