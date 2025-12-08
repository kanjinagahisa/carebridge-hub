'use client'

import { useState, useRef } from 'react'
import { Send, Image as ImageIcon, FileText, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { notifyNewPost } from '@/lib/utils/notifications'

interface ClientPostComposerProps {
  clientId: string
  currentUserId: string
  onPostCreated?: () => void
}

/**
 * 利用者タイムライン用投稿作成コンポーネント
 * テキスト投稿 + 添付ファイル（画像/PDF/動画）
 */
export default function ClientPostComposer({
  clientId,
  currentUserId,
  onPostCreated,
}: ClientPostComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      console.log('[ClientPostComposer] Files selected:', files.map(f => f.name))
      setSelectedFiles((prev) => [...prev, ...files])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileType = (file: File): 'image' | 'pdf' | 'video' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type.startsWith('video/')) return 'video'
    return 'image' // デフォルト
  }

  const handleSubmit = async () => {
    console.log('[ClientPostComposer] handleSubmit called', {
      hasContent: !!content.trim(),
      filesCount: selectedFiles.length,
      isSubmitting,
    })

    if ((!content.trim() && selectedFiles.length === 0) || isSubmitting) {
      console.log('[ClientPostComposer] handleSubmit early return', {
        hasContent: !!content.trim(),
        filesCount: selectedFiles.length,
        isSubmitting,
      })
      return
    }

    setIsSubmitting(true)
    console.log('[ClientPostComposer] Starting submission process')
    
    try {
      const supabase = createClient()

      // 利用者情報を取得してfacility_idを取得（投稿作成と添付ファイルのアップロードに必要）
      console.log('[ClientPostComposer] Fetching client information for clientId:', clientId)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('facility_id, name')
        .eq('id', clientId)
        .single()

      if (clientError || !client) {
        console.error('[ClientPostComposer] Failed to fetch client information:', clientError)
        alert('利用者情報の取得に失敗しました。')
        setIsSubmitting(false)
        return
      }

      console.log('[ClientPostComposer] Client information fetched:', {
        facility_id: client.facility_id,
        name: client.name,
      })

      // 投稿を作成
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          client_id: clientId,
          author_id: currentUserId,
          side: 'care', // 利用者投稿では side は使用しないが、既存スキーマとの互換性のため設定
          body: content.trim() || '',
        })
        .select()
        .single()

      if (postError) {
        console.error('Failed to create post:', postError)
        alert('投稿の作成に失敗しました。')
        setIsSubmitting(false)
        return
      }

      // 添付ファイルをアップロード
      console.log('[ClientPostComposer] Processing attachments', {
        filesCount: selectedFiles.length,
        hasPost: !!post,
      })
      
      if (selectedFiles.length > 0 && post) {
        console.log('[ClientPostComposer] Starting file upload loop for', selectedFiles.length, 'files')
        for (const file of selectedFiles) {
          const fileType = getFileType(file)
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${clientId}/${fileName}`

          // Supabase Storageにアップロード
          console.log(`[ClientPostComposer] Uploading file: ${file.name} to path: ${filePath}`)
          console.log(`[ClientPostComposer] File details:`, {
            name: file.name,
            size: file.size,
            type: file.type,
            filePath,
            clientId,
            facilityId: client.facility_id,
          })
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            console.error('[ClientPostComposer] Failed to upload file:', uploadError)
            console.error('[ClientPostComposer] Upload error details:', {
              message: uploadError.message,
              statusCode: (uploadError as any).statusCode,
              error: uploadError.error,
              name: uploadError.name,
            })
            alert(`ファイルのアップロードに失敗しました: ${uploadError.message}`)
            continue
          }

          // アップロード成功を確認
          if (!uploadData || !uploadData.path) {
            console.error('[ClientPostComposer] Upload succeeded but no data returned:', uploadData)
            alert(`ファイルのアップロードに失敗しました: データが返されませんでした`)
            continue
          }

          console.log('[ClientPostComposer] File uploaded successfully:', {
            path: uploadData.path,
            fullPath: filePath,
            fileName: file.name,
            id: uploadData.id,
          })

          // アップロード直後にファイルが存在するか確認（RLSポリシーで読み取り可能か確認）
          console.log('[ClientPostComposer] Verifying uploaded file exists in storage...')
          const { data: verifyData, error: verifyError } = await supabase.storage
            .from('attachments')
            .list(filePath.split('/')[0], {
              limit: 100,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' },
            })

          if (verifyError) {
            console.warn('[ClientPostComposer] Could not verify file existence:', verifyError)
            console.warn('[ClientPostComposer] This may indicate an RLS policy issue for reading files.')
          } else {
            const fileFound = verifyData?.some((f) => f.name === filePath.split('/')[1])
            console.log('[ClientPostComposer] File verification result:', {
              filePath,
              exists: fileFound,
              filesInFolder: verifyData?.length || 0,
              fileNames: verifyData?.map(f => f.name).slice(0, 5),
            })
            
            if (!fileFound) {
              console.error('[ClientPostComposer] WARNING: File was uploaded but not found in storage!')
              console.error('[ClientPostComposer] This may indicate an RLS policy issue or storage configuration problem.')
              console.error('[ClientPostComposer] Upload data:', uploadData)
            } else {
              console.log('[ClientPostComposer] ✓ File successfully verified in storage')
            }
          }

          // アップロードしたファイルから署名付きURLを生成して、実際にアクセス可能か確認
          console.log('[ClientPostComposer] Testing file access by creating signed URL...')
          const { data: testUrlData, error: testUrlError } = await supabase.storage
            .from('attachments')
            .createSignedUrl(filePath, 60) // 1分間有効なテストURL

          if (testUrlError) {
            console.error('[ClientPostComposer] WARNING: Could not create signed URL for uploaded file:', testUrlError)
            console.error('[ClientPostComposer] This indicates the file may not be accessible via RLS policies.')
          } else {
            console.log('[ClientPostComposer] ✓ Signed URL created successfully, file is accessible')
          }

          // attachmentsテーブルにレコードを追加
          // file_urlにはStorageパス（filePath）を保存（署名付きURLは表示時に生成）
          console.log('[ClientPostComposer] Inserting attachment record:', {
            post_id: post.id,
            facility_id: client.facility_id,
            client_id: clientId,
            file_url: filePath,
            file_name: file.name,
            file_type: fileType,
          })

          const { data: insertData, error: insertError } = await supabase
            .from('attachments')
            .insert({
              post_id: post.id,
              facility_id: client.facility_id,
              client_id: clientId,
              file_url: filePath, // Storageパスを保存
              file_name: file.name,
              file_type: fileType,
            })
            .select()
            .single()

          if (insertError) {
            console.error('[ClientPostComposer] Failed to insert attachment record:', insertError)
            console.error('[ClientPostComposer] Insert error details:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
            })
            alert(`添付ファイルの登録に失敗しました: ${insertError.message}`)
            // アップロードしたファイルを削除（ロールバック）
            await supabase.storage.from('attachments').remove([filePath])
            continue
          } else {
            console.log('[ClientPostComposer] Attachment record inserted successfully:', {
              attachment_id: insertData?.id,
              post_id: post.id,
              file_name: file.name,
              file_type: fileType,
              file_url: filePath,
            })
          }
        }
      }

      // 成功したらテキストとファイルをクリア
      setContent('')
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 通知を送信（モック）
      if (post && client) {
        const { data: authorData } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', currentUserId)
          .single()

        await notifyNewPost(
          post.id,
          client.facility_id,
          authorData?.display_name || '不明なユーザー',
          content.trim() || '（添付ファイルのみ）',
          'client',
          client.name
        )
      }

      // 親コンポーネントに通知
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
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

      {/* 選択されたファイルのプレビュー */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-sm text-gray-700 flex-1 truncate">
                {file.name}
              </span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* ファイル選択ボタン */}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,video/*"
              multiple
            />
            <div className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ImageIcon size={18} />
              <span className="text-sm">添付</span>
            </div>
          </label>
        </div>

        {/* 送信ボタン */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('[ClientPostComposer] Send button clicked', {
              hasContent: !!content.trim(),
              filesCount: selectedFiles.length,
              isSubmitting,
            })
            handleSubmit()
          }}
          disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send size={18} />
          {isSubmitting ? '送信中...' : '送信'}
        </button>
      </div>
    </div>
  )
}

