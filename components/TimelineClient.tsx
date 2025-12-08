'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { POST_SIDES, POST_SIDE_LABELS, REACTION_TYPES, REACTION_TYPE_LABELS, PROFESSION_LABELS } from '@/lib/constants'
import { Eye, Bookmark, BookmarkCheck, Paperclip, Send, Phone, MoreVertical, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'

interface TimelineClientProps {
  group: any
  carePosts: any[]
  clientPosts: any[]
  currentUserId: string
  isMember: boolean
}

export default function TimelineClient({
  group,
  carePosts,
  clientPosts,
  currentUserId,
  isMember,
}: TimelineClientProps) {
  const [activeSide, setActiveSide] = useState<string>(POST_SIDES.CARE)
  const [posts, setPosts] = useState(activeSide === POST_SIDES.CARE ? carePosts : clientPosts)
  const [newPostBody, setNewPostBody] = useState('')
  const [showVideoCallModal, setShowVideoCallModal] = useState(false)

  const handleSideChange = (side: string) => {
    setActiveSide(side)
    setPosts(side === POST_SIDES.CARE ? carePosts : clientPosts)
  }

  const handlePostSubmit = async () => {
    if (!newPostBody.trim() || !isMember) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('posts')
      .insert({
        group_id: group.id,
        author_id: currentUserId,
        side: activeSide,
        body: newPostBody,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return
    }

    // 投稿をリストに追加
    const newPost = {
      ...data,
      author: { display_name: '自分', profession: '' },
      reactions: [],
      attachments: [],
      reads: [],
    }
    setPosts([newPost, ...posts])
    setNewPostBody('')
  }

  const handleReaction = async (postId: string, reactionType: string) => {
    const supabase = createClient()
    const existingReaction = posts
      .find((p) => p.id === postId)
      ?.reactions?.find((r: any) => r.user_id === currentUserId && r.type === reactionType)

    if (existingReaction) {
      // リアクションを削除
      await supabase.from('post_reactions').delete().eq('id', existingReaction.id)
    } else {
      // リアクションを追加
      await supabase.from('post_reactions').insert({
        post_id: postId,
        user_id: currentUserId,
        type: reactionType,
      })
    }

    // 投稿リストを更新（実際には再取得が望ましい）
    window.location.reload()
  }

  const handleBookmark = async (postId: string) => {
    const supabase = createClient()
    const existingBookmark = posts
      .find((p) => p.id === postId)
      ?.bookmarks?.find((b: any) => b.user_id === currentUserId)

    if (existingBookmark) {
      await supabase.from('post_bookmarks').delete().eq('id', existingBookmark.id)
    } else {
      await supabase.from('post_bookmarks').insert({
        post_id: postId,
        user_id: currentUserId,
      })
    }

    window.location.reload()
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const readCount = (post: any) => {
    return post.reads?.length || 0
  }

  const isBookmarked = (post: any) => {
    return post.bookmarks?.some((b: any) => b.user_id === currentUserId) || false
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/home" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">
            {group.clients ? (Array.isArray(group.clients) ? group.clients[0]?.name : group.clients.name) : group.name}
          </h1>
          <button className="p-2">
            <MoreVertical size={20} className="text-gray-600" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleSideChange(POST_SIDES.CARE)}
            className={`flex-1 py-3 text-center font-medium ${
              activeSide === POST_SIDES.CARE
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            {POST_SIDE_LABELS[POST_SIDES.CARE]}
          </button>
          <button
            onClick={() => handleSideChange(POST_SIDES.CLIENT)}
            className={`flex-1 py-3 text-center font-medium ${
              activeSide === POST_SIDES.CLIENT
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            {POST_SIDE_LABELS[POST_SIDES.CLIENT]}
          </button>
        </div>
      </div>

      {/* 投稿一覧 */}
      <div className="p-4 space-y-4">
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm p-4">
              {/* 投稿者情報 */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {post.author?.display_name || '不明'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {post.author?.profession ? PROFESSION_LABELS[post.author.profession] : ''}
                    {' • '}
                    {format(new Date(post.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </p>
                </div>
              </div>

              {/* 本文 */}
              <p className="text-gray-900 whitespace-pre-wrap mb-3">{post.body}</p>

              {/* 添付ファイル */}
              {post.attachments && post.attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {post.attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <Paperclip size={16} />
                      <span>{attachment.file_name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* アクション */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  {/* リアクション */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReaction(post.id, REACTION_TYPES.OK)}
                      className="text-sm text-gray-600 hover:text-primary"
                    >
                      {REACTION_TYPE_LABELS[REACTION_TYPES.OK]}
                    </button>
                    <button
                      onClick={() => handleReaction(post.id, REACTION_TYPES.THANKS)}
                      className="text-sm text-gray-600 hover:text-primary"
                    >
                      {REACTION_TYPE_LABELS[REACTION_TYPES.THANKS]}
                    </button>
                    <button
                      onClick={() => handleReaction(post.id, REACTION_TYPES.CHECK)}
                      className="text-sm text-gray-600 hover:text-primary"
                    >
                      {REACTION_TYPE_LABELS[REACTION_TYPES.CHECK]}
                    </button>
                  </div>

                  {/* 既読数 */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye size={14} />
                    <span>{readCount(post)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(post.body)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="コピー"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleBookmark(post.id)}
                    className={`p-1 ${isBookmarked(post) ? 'text-secondary' : 'text-gray-500 hover:text-gray-700'}`}
                    title="しおり"
                  >
                    {isBookmarked(post) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600">投稿がありません。</p>
          </div>
        )}
      </div>

      {/* 投稿欄 */}
      {isMember && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowVideoCallModal(true)}
              className="p-2 text-gray-600 hover:text-gray-700"
            >
              <Phone size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-700">
              <Paperclip size={20} />
            </button>
            <textarea
              value={newPostBody}
              onChange={(e) => setNewPostBody(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handlePostSubmit()
                }
              }}
            />
            <button
              onClick={handlePostSubmit}
              disabled={!newPostBody.trim()}
              className="p-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ビデオ通話モーダル */}
      {showVideoCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 m-4 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ビデオ通話</h2>
            <p className="text-gray-600 mb-6">ビデオ通話機能は開発中です。</p>
            <button
              onClick={() => setShowVideoCallModal(false)}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

