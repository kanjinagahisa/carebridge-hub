'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import { ThumbsUp, Eye } from 'lucide-react'
import type { Post } from '@/types/carebridge'

interface NewPostSummaryCardProps {
  post: Post & {
    groups?: { name: string } | null
    clients?: { name: string } | null
    author?: { display_name: string } | null
    postType?: 'group' | 'client'
  }
  currentUserId?: string
  isUnread?: boolean
}

/**
 * 新着投稿まとめカードコンポーネント
 * 既存のデザインパターン（bg-white rounded-xl shadow-sm）を使用
 * グループ投稿と利用者投稿の両方に対応
 */
export default function NewPostSummaryCard({ post, currentUserId, isUnread = false }: NewPostSummaryCardProps) {
  const isClientPost = post.postType === 'client' || !!post.client_id
  const postName = isClientPost 
    ? (post.clients?.name || '利用者名不明')
    : (post.groups?.name || 'グループ名不明')
  const authorName = post.author?.display_name || '不明なユーザー'
  const likeCount = (post.reactions && Array.isArray(post.reactions)) 
    ? post.reactions.filter((r) => r && r.type === 'like').length 
    : 0
  const readCount = (post.reads && Array.isArray(post.reads)) ? post.reads.length : 0
  
  // 現在のユーザーが既読かどうかを判定
  const isReadByCurrentUser = currentUserId && post.reads && Array.isArray(post.reads)
    ? post.reads.some((r: any) => r && r.user_id === currentUserId)
    : false
  const showUnreadBadge = isUnread || (!isReadByCurrentUser && currentUserId)

  // 投稿本文を2〜3行で省略（最大100文字）
  const bodyText = post.body || ''
  const bodyPreview = bodyText.length > 100
    ? bodyText.substring(0, 100) + '...'
    : bodyText

  // リンク先を決定（IDが存在することを確認）
  const linkHref = isClientPost 
    ? (post.client_id ? `/clients/${post.client_id}/timeline` : '#')
    : (post.group_id ? `/groups/${post.group_id}` : '#')

  // IDが存在しない場合はリンクを無効化
  if (!post.client_id && !post.group_id) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 opacity-50">
        <p className="text-sm text-gray-600">投稿データが不完全です</p>
      </div>
    )
  }

  return (
    <Link
      href={linkHref}
      className="block bg-white rounded-xl shadow-sm p-4 hover:bg-gray-50 transition-colors"
    >
      {/* 種別ラベルと名前 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">
          {isClientPost ? '🧑‍🦽 利用者' : '👥 グループ'}
        </span>
        <h3 className="font-semibold text-gray-900">{postName}</h3>
        {showUnreadBadge && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            新着
          </span>
        )}
      </div>

      {/* 投稿日時 */}
      <p className="text-xs text-gray-500 mb-2">
        {(() => {
          if (!post.created_at) return '日時不明'
          try {
            const date = new Date(post.created_at)
            if (isNaN(date.getTime())) return '日時不明'
            return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja })
          } catch (error) {
            console.error('[NewPostSummaryCard] Date format error:', error)
            return '日時不明'
          }
        })()}
      </p>

      {/* 投稿本文（2〜3行で省略） */}
      <p className="text-sm text-gray-800 mb-3 line-clamp-3 whitespace-pre-wrap">
        {bodyPreview}
      </p>

      {/* 投稿者名・いいね数・既読数 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="text-gray-600">{authorName}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <ThumbsUp size={14} className="text-gray-400" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={14} className="text-gray-400" />
            <span>既読 {readCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}



