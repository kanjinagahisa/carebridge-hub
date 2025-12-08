'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types/carebridge'
import PostCard from './PostCard'
import PostComposer from './PostComposer'
import { POST_SIDES } from '@/lib/constants'

interface GroupTimelineProps {
  groupId: string
  currentUserId: string
  initialPosts?: Post[]
  userRole?: 'admin' | 'staff' | null
}

/**
 * グループタイムラインコンポーネント
 * 投稿一覧と投稿作成を統合
 */
export default function GroupTimeline({
  groupId,
  currentUserId,
  initialPosts = [],
}: GroupTimelineProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)

  // 投稿一覧を取得
  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          author:users(display_name, profession),
          reactions:post_reactions(*),
          reads:post_reads(user_id),
          attachments(*)
        `
        )
        .eq('group_id', groupId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Failed to load posts:', error)
        return
      }

      setPosts((data as Post[]) || [])

      // 既読をマーク（タイムライン表示時に read を登録）
      if (data && data.length > 0) {
        const postIds = data.map((p) => p.id)
        const { data: existingReads } = await supabase
          .from('post_reads')
          .select('post_id')
          .in('post_id', postIds)
          .eq('user_id', currentUserId)

        const readPostIds = new Set(existingReads?.map((r) => r.post_id) || [])
        const unreadPostIds = postIds.filter((id) => !readPostIds.has(id))

        if (unreadPostIds.length > 0) {
          // 未読の投稿に既読をマーク
          await supabase.from('post_reads').insert(
            unreadPostIds.map((postId) => ({
              post_id: postId,
              user_id: currentUserId,
            }))
          )
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初期読み込み
  useEffect(() => {
    if (initialPosts.length === 0) {
      loadPosts()
    } else {
      setPosts(initialPosts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  // 投稿作成後のコールバック
  const handlePostCreated = () => {
    loadPosts()
  }

  // いいね変更後のコールバック
  const handleReactionChange = () => {
    loadPosts()
  }

  return (
    <div className="space-y-4">
      {/* 投稿作成エリア */}
      <PostComposer
        groupId={groupId}
        currentUserId={currentUserId}
        onPostCreated={handlePostCreated}
      />

      {/* 投稿一覧 */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onReactionChange={handleReactionChange}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">まだこのグループには投稿がありません。</p>
          <p className="text-sm text-gray-500">
            今日の様子や連絡事項を、ここから共有できます。
          </p>
        </div>
      )}
    </div>
  )
}

