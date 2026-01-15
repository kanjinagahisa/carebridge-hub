'use client'

import { useState, useEffect } from 'react'
import { Edit2, X, Check } from 'lucide-react'
import type { Client } from '@/types/carebridge'
import { updateClient } from '@/lib/api/clients'
import { canEditClient } from '@/lib/utils/auth'
import EditableTextArea from '@/components/common/EditableTextArea'

interface ClientMemoCardProps {
  client: Client
  onUpdate: (updatedClient: Client) => void
}

/**
 * メモカードコンポーネント
 * 医療情報・支援メモを表示・編集（admin/staffのみ）
 */
export default function ClientMemoCard({
  client,
  onUpdate,
}: ClientMemoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [memo, setMemo] = useState(client.memo || '')

  // 編集権限をチェック
  useEffect(() => {
    canEditClient(client.facility_id).then((hasPermission) => {
      setCanEdit(hasPermission)
    })
  }, [client.facility_id])

  // client.memoが変更されたらローカルstateを更新
  useEffect(() => {
    setMemo(client.memo || '')
  }, [client.memo])

  const handleEdit = () => {
    setIsEditing(true)
    setMemo(client.memo || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setMemo(client.memo || '')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateClient(client.id, {
        memo: memo.trim() || null,
      })

      const updatedClient: Client = {
        ...client,
        memo: memo.trim() || null,
      }

      onUpdate(updatedClient)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update memo:', error)
      alert('更新に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          メモ（医療情報・支援メモなど）
        </h2>
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
          <EditableTextArea
            value={memo}
            onChange={setMemo}
            placeholder="既往歴、アレルギー、服薬、支援のコツ など&#10;現場で共有したい情報を自由に記載できます。"
            rows={8}
          />

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
              disabled={isSaving}
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
        <div>
          {client.memo ? (
            <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
              {client.memo}
            </p>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm mb-2">まだメモが登録されていません。</p>
              <p className="text-xs">
                医療情報や支援のコツなどを共有したい場合にご活用ください。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}









