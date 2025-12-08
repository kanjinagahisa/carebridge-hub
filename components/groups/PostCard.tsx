'use client'

import { useState } from 'react'
import { Heart, Eye, X, FileText, Video, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types/carebridge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'

interface PostCardProps {
  post: Post
  currentUserId: string
  onReactionChange?: () => void
}

/**
 * 投稿カードコンポーネント
 * 投稿者名、投稿日時、本文、画像（あれば）、いいね数、既読数を表示
 */
export default function PostCard({
  post,
  currentUserId,
  onReactionChange,
}: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  // 楽観的更新用のローカル状態
  const [localHasLiked, setLocalHasLiked] = useState<boolean | null>(null)
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)
  // 添付ファイルのエラー状態を管理
  const [attachmentErrors, setAttachmentErrors] = useState<Set<string>>(new Set())

  // いいねの状態を確認（楽観的更新を優先）
  const hasLiked = localHasLiked !== null 
    ? localHasLiked 
    : post.reactions?.some((r) => r.user_id === currentUserId && r.type === 'like') || false
  
  const likeCount = localLikeCount !== null
    ? localLikeCount
    : post.reactions?.filter((r) => r.type === 'like').length || 0
  
  const readCount = post.reads?.length || 0

  // いいねのトグル
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLiking) return

    // スクロール位置を保存
    const scrollPosition = window.scrollY

    // 楽観的更新：即座にUIを更新
    const currentHasLiked = hasLiked
    const currentLikeCount = likeCount
    const newHasLiked = !currentHasLiked
    const newLikeCount = newHasLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1)
    
    setLocalHasLiked(newHasLiked)
    setLocalLikeCount(newLikeCount)

    setIsLiking(true)
    try {
      const supabase = createClient()
      const existingReaction = post.reactions?.find(
        (r) => r.user_id === currentUserId && r.type === 'like'
      )

      if (existingReaction) {
        // いいねを削除
        const { error } = await supabase.from('post_reactions').delete().eq('id', existingReaction.id)
        if (error) {
          console.error('Failed to delete reaction:', error)
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          // エラーが発生した場合、楽観的更新を元に戻す
          setLocalHasLiked(currentHasLiked)
          setLocalLikeCount(currentLikeCount)
          alert('いいねの削除に失敗しました。ページをリロードして再試行してください。')
        }
      } else {
        // いいねを追加
        const { error } = await supabase.from('post_reactions').insert({
          post_id: post.id,
          user_id: currentUserId,
          type: 'like',
        })
        if (error) {
          console.error('Failed to insert reaction:', error)
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          // エラーが発生した場合、楽観的更新を元に戻す
          setLocalHasLiked(currentHasLiked)
          setLocalLikeCount(currentLikeCount)
          // RLSエラーの場合、より詳細なメッセージを表示
          if (error.code === '42501') {
            alert('権限エラー: いいねを追加する権限がありません。同じ施設のメンバーであることを確認してください。')
          } else {
            alert('いいねの追加に失敗しました。ページをリロードして再試行してください。')
          }
        }
      }

      // 親コンポーネントに変更を通知（バックグラウンドで実行）
      if (onReactionChange) {
        // 非同期で実行し、UIの更新をブロックしない
        setTimeout(() => {
          onReactionChange()
        }, 100)
      }

      // スクロール位置を復元（次のレンダリングサイクルで実行）
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition)
      })
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // エラーが発生した場合、楽観的更新を元に戻す
      setLocalHasLiked(currentHasLiked)
      setLocalLikeCount(currentLikeCount)
    } finally {
      setIsLiking(false)
    }
  }

  // 日時フォーマット
  const formattedDate = format(new Date(post.created_at), 'yyyy年MM月dd日 HH:mm', {
    locale: ja,
  })

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      {/* 投稿者名と投稿日時 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            {post.author?.display_name || '不明'}
          </p>
          {post.author?.profession && (
            <p className="text-xs text-gray-500">{post.author.profession}</p>
          )}
        </div>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>

      {/* 本文 */}
      <p className="text-gray-800 whitespace-pre-wrap">{post.body}</p>

      {/* 添付ファイル（画像、PDF、動画） */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="space-y-2">
          {post.attachments.map((attachment) => {
            // file_urlが無効な場合（null、undefined、空文字列）は表示しない
            if (!attachment.file_url) {
              return (
                <div
                  key={attachment.id}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3"
                >
                  <FileText size={24} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500">ファイルが見つかりません</p>
                  </div>
                </div>
              )
            }

            if (attachment.file_type === 'image') {
              const hasError = attachmentErrors.has(attachment.id)
              if (hasError) {
                return (
                  <div
                    key={attachment.id}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-center"
                  >
                    <p className="text-sm text-gray-600">{attachment.file_name}</p>
                    <p className="text-xs text-gray-500 mt-1">画像を読み込めませんでした</p>
                  </div>
                )
              }
              return (
                <div
                  key={attachment.id}
                  className="w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer"
                  onClick={() => attachment.file_url && setExpandedImage(attachment.file_url)}
                >
                  <img
                    src={attachment.file_url}
                    alt={attachment.file_name}
                    className="max-w-full max-h-96 w-auto h-auto object-contain rounded-lg"
                    onError={() => {
                      // 画像の読み込みに失敗した場合、エラー状態を設定
                      setAttachmentErrors((prev) => new Set(prev).add(attachment.id))
                    }}
                  />
                </div>
              )
            }
            if (attachment.file_type === 'pdf') {
              return (
                <div
                  key={attachment.id}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 flex items-center gap-3"
                >
                  <FileText size={24} className="text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500">PDFファイル</p>
                  </div>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download size={16} />
                    開く
                  </a>
                </div>
              )
            }
            if (attachment.file_type === 'video') {
              const hasError = attachmentErrors.has(attachment.id)
              if (hasError) {
                return (
                  <div
                    key={attachment.id}
                    className="w-full rounded-lg border border-gray-200 bg-gray-800 p-4 text-center"
                  >
                    <p className="text-sm text-gray-300">{attachment.file_name}</p>
                    <p className="text-xs text-gray-400 mt-1">動画を読み込めませんでした</p>
                  </div>
                )
              }
              return (
                <div
                  key={attachment.id}
                  className="w-full rounded-lg overflow-hidden bg-gray-900"
                >
                  <video
                    src={attachment.file_url}
                    controls
                    className="w-full max-h-96"
                    onError={() => {
                      // 動画の読み込みに失敗した場合、エラー状態を設定
                      setAttachmentErrors((prev) => new Set(prev).add(attachment.id))
                    }}
                  >
                    お使いのブラウザは動画タグをサポートしていません。
                  </video>
                  <div className="p-2 bg-gray-800 flex items-center gap-2">
                    <Video size={16} className="text-gray-400" />
                    <p className="text-xs text-gray-300 truncate">
                      {attachment.file_name}
                    </p>
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      {/* 画像拡大モーダル */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2"
            aria-label="閉じる"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={expandedImage}
              alt="拡大画像"
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* いいね数と既読数 */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
            hasLiked
              ? 'text-red-600 bg-red-50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart size={16} className={hasLiked ? 'fill-current' : ''} />
          <span className="text-sm">{likeCount}</span>
        </button>
        <div className="flex items-center gap-1 text-gray-600">
          <Eye size={16} />
          <span className="text-sm">既読 {readCount}</span>
        </div>
      </div>
    </div>
  )
}






