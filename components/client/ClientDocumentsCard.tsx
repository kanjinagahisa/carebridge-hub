'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, FileText, Download, Trash2, X } from 'lucide-react'
import type { Client, ClientDocument } from '@/types/carebridge'
import {
  fetchClientDocuments,
  uploadClientDocument,
  deleteClientDocument,
  getClientDocumentUrl,
} from '@/lib/api/clients'
import { canEditClient } from '@/lib/utils/auth'
import ConfirmDialog from '@/components/common/ConfirmDialog'
// 日付フォーマット用の簡易関数
const formatDocumentDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  } catch {
    return dateString
  }
}

interface ClientDocumentsCardProps {
  client: Client
}

/**
 * 書類カードコンポーネント
 * 書類一覧、アップロード、削除機能（admin/staffのみ）
 */
export default function ClientDocumentsCard({
  client,
}: ClientDocumentsCardProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClientDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 編集権限をチェック
  useEffect(() => {
    canEditClient(client.facility_id).then((hasPermission) => {
      setCanEdit(hasPermission)
    })
  }, [client.facility_id])

  // 書類一覧を取得
  useEffect(() => {
    loadDocuments()
  }, [client.id])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await fetchClientDocuments(client.id)
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
      alert('書類の読み込みに失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルタイプのバリデーション（クライアント側）
    const allowedTypes = [
      // 画像
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif',
      // 動画
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv',
      // ドキュメント
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.mp4', '.mov', '.avi', '.wmv', '.doc', '.docx']
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isAllowedType = allowedTypes.includes(file.type) || 
                          allowedExtensions.includes(fileExtension) ||
                          file.type.startsWith('image/') ||
                          file.type.startsWith('video/')

    if (!isAllowedType) {
      alert('このファイル形式はサポートされていません。\n対応形式: PDF, 画像（JPG/PNG/HEIC等）, 動画（MP4/MOV等）, Word（DOC/DOCX）')
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsUploading(true)
    try {
      await uploadClientDocument(client.id, file)
      await loadDocuments()
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Failed to upload document:', error)
      alert('書類のアップロードに失敗しました。')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (doc: ClientDocument) => {
    try {
      const url = await getClientDocumentUrl(doc)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Failed to get document URL:', error)
      alert('書類のダウンロードに失敗しました。')
    }
  }

  const handleDeleteClick = (doc: ClientDocument) => {
    setDeleteTarget(doc)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      await deleteClientDocument(deleteTarget)
      await loadDocuments()
      setDeleteTarget(null)
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('書類の削除に失敗しました。')
      setDeleteTarget(null)
    }
  }

  const getFileIcon = (doc: ClientDocument) => {
    // ファイル名の拡張子からアイコンを判定（簡易版）
    const ext = doc.name.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return '🖼️'
    }
    if (['pdf'].includes(ext || '')) {
      return '📄'
    }
    return '📎'
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">書類</h2>
          {canEdit && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={18} />
              {isUploading ? 'アップロード中...' : '書類を追加'}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          // accept属性を*/*に設定（すべてのファイルタイプを許可）
          // macOSのファイル選択ダイアログの制限を回避するため
          // クライアント側でバリデーションを行う（handleFileSelect内）
          accept="*/*"
        />

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">読み込み中...</p>
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">
                  {getFileIcon(doc)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.type && (
                      <span className="text-xs text-gray-500">{doc.type}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDocumentDate(doc.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="ダウンロード"
                  >
                    <Download size={18} className="text-gray-600" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteClick(doc)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-2">まだ書類が登録されていません。</p>
            <p className="text-xs">
              必要に応じて計画書や報告書を追加できます。
            </p>
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="書類の削除"
        message="この書類を削除してもよろしいですか？"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
      />
    </>
  )
}

