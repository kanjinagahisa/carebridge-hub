'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, FileText, Video, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// 投稿サイドの型と定数
const POST_SIDES = ['staff', 'care'] as const
type PostSide = (typeof POST_SIDES)[number]
const DEFAULT_POST_SIDE: PostSide = 'staff'

const MAX_FILES = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface ClientPostComposerProps {
  clientId: string
  currentUserId: string
  facilityId: string
  onPostCreated?: () => void
}

function getFileType(file: File): 'image' | 'video' | 'pdf' | null {
  if (isHeic(file)) return 'image'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf') return 'pdf'
  return null // handleFileSelect で除外済みのためここには到達しない
}

function getFileExt(file: File): string {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin'
}

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  )
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
  const blob = Array.isArray(result) ? result[0] : result
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
  return new File([blob], newName, { type: 'image/jpeg' })
}

/**
 * 利用者用投稿作成コンポーネント
 * テキスト + 添付ファイル（画像・動画・PDF、最大10件、1件50MB以内）
 */
export default function ClientPostComposer({
  clientId,
  currentUserId,
  facilityId,
  onPostCreated,
}: ClientPostComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const errors: string[] = []
    const valid: File[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`「${file.name}」は50MBを超えています。`)
        continue
      }
      const isAccepted =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type === 'application/pdf' ||
        isHeic(file)
      if (!isAccepted) {
        errors.push(`「${file.name}」は対応していないファイル形式です（画像・動画・PDFのみ）。`)
        continue
      }
      valid.push(file)
    }

    const combined = [...selectedFiles, ...valid]
    if (combined.length > MAX_FILES) {
      errors.push(`添付ファイルは最大${MAX_FILES}件です。`)
      setSelectedFiles(combined.slice(0, MAX_FILES))
    } else {
      setSelectedFiles(combined)
    }

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    // 同じファイルを再選択できるようにリセット
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if ((!content.trim() && selectedFiles.length === 0) || isSubmitting) return

    setIsSubmitting(true)
    const supabase = createClient()

    let post: { id: string } | null = null
    const uploadedPaths: string[] = []
    const uploadedFiles: File[] = [] // 変換後の実アップロードファイル（HEIC → JPEG 後）

    // rollback: storage 削除 + post を deleted=true にする
    const rollback = async () => {
      if (uploadedPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('attachments')
          .remove(uploadedPaths)
        if (removeError) {
          console.error('[ClientPostComposer] Rollback: failed to remove storage files:', removeError)
        }
      }
      if (post) {
        const { error: deleteError } = await supabase
          .from('posts')
          .update({ deleted: true })
          .eq('id', post.id)
          .eq('author_id', currentUserId)
        if (deleteError) {
          console.error('[ClientPostComposer] Rollback: failed to mark post as deleted:', deleteError)
        }
      }
    }

    try {
      // 1. post INSERT
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          client_id: clientId,
          author_id: currentUserId,
          side: DEFAULT_POST_SIDE,
          body: content.trim(),
        })
        .select()
        .single()

      if (postError || !postData) {
        console.error('[ClientPostComposer] Failed to create post:', postError)
        alert('投稿の作成に失敗しました。')
        return
      }
      post = postData
      const postId = postData.id

      // 2. ファイルを storage にアップロード
      let uploadFailed = false

      for (const file of selectedFiles) {
        // HEIC/HEIF → JPEG 変換（Chrome 系で表示できないため）
        let uploadFile = file
        if (isHeic(file)) {
          try {
            uploadFile = await convertHeicToJpeg(file)
          } catch (convErr) {
            console.error('[ClientPostComposer] HEIC conversion failed:', file.name, convErr)
            uploadFailed = true
            break
          }
        }

        const ext = getFileExt(uploadFile)
        const storagePath = `${clientId}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storagePath, uploadFile, { upsert: false })

        if (uploadError) {
          console.error('[ClientPostComposer] Failed to upload file:', file.name, uploadError)
          uploadFailed = true
          break
        }
        uploadedPaths.push(storagePath)
        uploadedFiles.push(uploadFile)
      }

      if (uploadFailed) {
        await rollback()
        alert('ファイルのアップロードに失敗しました。投稿を取り消しました。')
        return
      }

      // 3. attachments INSERT（post が deleted=false の間に行う）
      if (uploadedPaths.length > 0) {
        const attachmentRows: {
          post_id: string; facility_id: string; client_id: string
          file_url: string; file_name: string; file_type: 'image' | 'video' | 'pdf'
        }[] = []
        for (let i = 0; i < uploadedPaths.length; i++) {
          const fileType = getFileType(uploadedFiles[i])
          if (!fileType) {
            await rollback()
            alert('対応していないファイル形式です。投稿を取り消しました。')
            return
          }
          attachmentRows.push({
            post_id: postId,
            facility_id: facilityId,
            client_id: clientId,
            file_url: uploadedPaths[i],
            file_name: uploadedFiles[i].name,
            file_type: fileType,
          })
        }

        const { error: attachError } = await supabase.from('attachments').insert(attachmentRows)

        if (attachError) {
          console.error('[ClientPostComposer] Failed to insert attachments:', attachError)
          await rollback()
          alert('添付ファイルの保存に失敗しました。投稿を取り消しました。')
          return
        }
      }

      // 4. Web Push 通知（失敗しても投稿は維持）
      try {
        const response = await fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, clientId }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[ClientPostComposer] Failed to send push notification:', errorData)
        }
      } catch (err) {
        console.error('[ClientPostComposer] Error sending push notification:', err)
        // 通知送信の失敗は投稿作成を阻害しない
      }

      // 5. 成功 → 状態リセット
      setContent('')
      setSelectedFiles([])
      if (onPostCreated) onPostCreated()
    } catch (error) {
      console.error('[ClientPostComposer] Unexpected error:', error)
      await rollback()
      alert('投稿の作成に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = (content.trim().length > 0 || selectedFiles.length > 0) && !isSubmitting

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="今日の様子や連絡事項を共有できます..."
        rows={4}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
      />

      {/* 選択済みファイル一覧 */}
      {selectedFiles.length > 0 && (
        <ul className="space-y-1">
          {selectedFiles.map((file, i) => {
            const type = getFileType(file)
            return (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5"
              >
                {type === 'image' ? (
                  <ImageIcon size={14} className="text-blue-500 flex-shrink-0" />
                ) : type === 'video' ? (
                  <Video size={14} className="text-purple-500 flex-shrink-0" />
                ) : (
                  <FileText size={14} className="text-red-500 flex-shrink-0" />
                )}
                <span className="truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 disabled:opacity-40"
                  aria-label={`${file.name} を削除`}
                >
                  <X size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between">
        {/* ファイル添付ボタン */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting || selectedFiles.length >= MAX_FILES}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="ファイルを添付"
        >
          <Paperclip size={16} />
          <span>添付</span>
          {selectedFiles.length > 0 && (
            <span className="text-xs text-gray-400">
              ({selectedFiles.length}/{MAX_FILES})
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send size={18} />
          {isSubmitting ? '送信中...' : '送信'}
        </button>
      </div>
    </div>
  )
}
