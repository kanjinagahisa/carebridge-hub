'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post, Attachment } from '@/types/carebridge'
import PostCard from './PostCard'
import PostComposer from './PostComposer'

const PAGE_SIZE = 20

interface GroupTimelineProps {
  groupId: string
  currentUserId: string
  initialPosts?: Post[]
  facilityId: string
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
  facilityId,
}: GroupTimelineProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingUrls, setIsGeneratingUrls] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [oldestCreatedAt, setOldestCreatedAt] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = useRef(false)
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})

  // 既読をマークする関数
  const markPostsAsRead = async (postList: Post[]) => {
    if (postList.length === 0) return
    try {
      const supabase = createClient()
      const postIds = postList.map((p) => p.id)
      const { data: existingReads, error: selectError } = await supabase
        .from('post_reads')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', currentUserId)

      if (selectError) {
        console.error('[GroupTimeline] Failed to fetch existing reads:', selectError)
        return
      }

      const readPostIds = new Set(existingReads?.map((r) => r.post_id) || [])
      const unreadPostIds = postIds.filter((id) => !readPostIds.has(id))

      if (unreadPostIds.length > 0) {
        const { error: insertError } = await supabase.from('post_reads').insert(
          unreadPostIds.map((postId) => ({
            post_id: postId,
            user_id: currentUserId,
          }))
        )
        if (insertError) {
          console.error('[GroupTimeline] Failed to mark posts as read:', insertError)
        }
      }
    } catch (error) {
      console.error('[GroupTimeline] Unexpected error marking posts as read:', error)
    }
  }

  // 投稿一覧を取得（初回 / リセット）
  const loadPosts = async (): Promise<void> => {
    setIsLoading(true)
    setHasMore(false)
    setOldestCreatedAt(null)
    setIsLoadingMore(false)
    isLoadingMoreRef.current = false
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          reactions:post_reactions(*),
          reads:post_reads(user_id),
          attachments(*)
        `
        )
        .eq('group_id', groupId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) {
        console.error('[GroupTimeline] Failed to load posts:', error)
        return
      }

      let loadedPosts = (data as Post[]) || []
      if (loadedPosts.length > 0) {
        const authorIds = [...new Set(loadedPosts.map((p: any) => p.author_id).filter(Boolean))]
        if (authorIds.length > 0) {
          const { data: authors, error: authorsError } = await supabase
            .from('users')
            .select('id, display_name, profession')
            .in('id', authorIds)
            .eq('deleted', false)

          if (!authorsError && authors) {
            const authorsMap = new Map(authors.map((a: any) => [a.id, a]))
            loadedPosts = loadedPosts.map((post: any) => ({
              ...post,
              author: authorsMap.get(post.author_id) || null,
            }))
          }
        }
      }

      let postsWithSignedUrls = loadedPosts
      if (loadedPosts.length > 0) {
        postsWithSignedUrls = await generateSignedUrls(loadedPosts)
      }

      setPosts(postsWithSignedUrls)
      if (postsWithSignedUrls.length === PAGE_SIZE) {
        setHasMore(true)
        setOldestCreatedAt(postsWithSignedUrls[postsWithSignedUrls.length - 1].created_at ?? null)
      }
      await markPostsAsRead(postsWithSignedUrls)
    } catch (error) {
      console.error('[GroupTimeline] Failed to load posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 追加読み込み（カーソルページング）
  const loadMorePosts = async (): Promise<void> => {
    if (!hasMore || isLoadingMore || !oldestCreatedAt) return
    if (isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          reactions:post_reactions(*),
          reads:post_reads(user_id),
          attachments(*)
        `
        )
        .eq('group_id', groupId)
        .eq('deleted', false)
        .lt('created_at', oldestCreatedAt)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (error) {
        console.error('[GroupTimeline] Failed to load more posts:', error)
        return
      }

      let newPosts = (data as Post[]) || []

      if (newPosts.length > 0) {
        const authorIds = [...new Set(newPosts.map((p: any) => p.author_id).filter(Boolean))]
        if (authorIds.length > 0) {
          const { data: authors, error: authorsError } = await supabase
            .from('users')
            .select('id, display_name, profession')
            .in('id', authorIds)
            .eq('deleted', false)
          if (!authorsError && authors) {
            const authorsMap = new Map(authors.map((a: any) => [a.id, a]))
            newPosts = newPosts.map((post: any) => ({
              ...post,
              author: authorsMap.get(post.author_id) || null,
            }))
          }
        }
      }

      const newPostsWithUrls = newPosts.length > 0 ? await generateSignedUrls(newPosts) : newPosts

      // 重複除去してappend
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const deduplicated = newPostsWithUrls.filter((p) => !existingIds.has(p.id))
        return [...prev, ...deduplicated]
      })

      if (newPostsWithUrls.length === PAGE_SIZE) {
        setHasMore(true)
        setOldestCreatedAt(newPostsWithUrls[newPostsWithUrls.length - 1].created_at ?? null)
      } else {
        setHasMore(false)
      }

      if (newPostsWithUrls.length > 0) {
        await markPostsAsRead(newPostsWithUrls)
      }
    } catch (error) {
      console.error('[GroupTimeline] Failed to load more posts:', error)
    } finally {
      setIsLoadingMore(false)
      isLoadingMoreRef.current = false
    }
  }

  // 署名付きURLを生成する（リトライ付き）
  const createSignedUrlWithRetry = async (
    supabase: ReturnType<typeof createClient>,
    storagePath: string,
    attachmentId: string,
    maxRetries = 3
  ): Promise<string | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('attachments')
          .createSignedUrl(storagePath, 300)

        if (urlError) {
          if ((urlError as any).statusCode === '404' || urlError.message?.includes('not found')) {
            console.error(`[GroupTimeline] File not found for attachment ${attachmentId}`)
            return null
          }
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
            console.warn(
              `[GroupTimeline] Failed to create signed URL for ${attachmentId} (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }
          console.error(`[GroupTimeline] Failed to create signed URL for ${attachmentId}:`, urlError)
          return null
        }

        if (urlData?.signedUrl) return urlData.signedUrl
        return null
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        console.error(`[GroupTimeline] Error creating signed URL for ${attachmentId}:`, error)
        return null
      }
    }
    return null
  }

  // 添付ファイルの署名付きURLを生成する関数
  const generateSignedUrls = async (postList: Post[]): Promise<Post[]> => {
    if (postList.length === 0) return postList

    setIsGeneratingUrls(true)
    const supabase = createClient()

    try {
      const updatedPosts = await Promise.all(
        postList.map(async (post) => {
          if (!post.attachments || !Array.isArray(post.attachments) || post.attachments.length === 0) {
            return post
          }

          const updatedAttachments = (await Promise.all(
            post.attachments.map(async (attachment): Promise<Attachment | null> => {
              if (!attachment.file_url) return attachment

              if (attachment.file_url.startsWith('http://') || attachment.file_url.startsWith('https://')) {
                try {
                  const urlObj = new URL(attachment.file_url)
                  const pathMatch = urlObj.pathname.match(/\/object\/sign\/attachments\/(.+)/)
                  if (pathMatch && pathMatch[1]) {
                    const storagePath = decodeURIComponent(pathMatch[1].split('?')[0])
                    const signedUrl = await createSignedUrlWithRetry(supabase, storagePath, attachment.id)
                    if (signedUrl) return { ...attachment, file_url: signedUrl }
                  }
                  console.warn(
                    `[GroupTimeline] Could not extract storage path for attachment ${attachment.id}`
                  )
                  return null
                } catch (error) {
                  console.error(
                    `[GroupTimeline] Error processing signed URL for attachment ${attachment.id}:`,
                    error
                  )
                  return null
                }
              }

              const signedUrl = await createSignedUrlWithRetry(supabase, attachment.file_url, attachment.id)
              if (signedUrl) return { ...attachment, file_url: signedUrl }
              return null
            })
          )).filter((a): a is Attachment => a !== null)

          return { ...post, attachments: updatedAttachments }
        })
      )

      return updatedPosts
    } finally {
      setIsGeneratingUrls(false)
    }
  }

  // 初期読み込みと既読処理
  useEffect(() => {
    const initializePosts = async () => {
      setHasMore(false)
      setOldestCreatedAt(null)
      setIsLoadingMore(false)
      isLoadingMoreRef.current = false
      setIsLoading(true)
      try {
        if (initialPosts.length === 0) {
          await loadPosts()
        } else {
          const postsWithSignedUrls = await generateSignedUrls(initialPosts)
          setPosts(postsWithSignedUrls)
          if (postsWithSignedUrls.length === PAGE_SIZE) {
            setHasMore(true)
            setOldestCreatedAt(postsWithSignedUrls[postsWithSignedUrls.length - 1].created_at ?? null)
          }
          await markPostsAsRead(postsWithSignedUrls)
        }
      } catch (error) {
        console.error('[GroupTimeline] Error initializing posts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    initializePosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  // loadMoreRef を常に最新の loadMorePosts に同期
  useEffect(() => {
    loadMoreRef.current = loadMorePosts
  })

  // IntersectionObserver で sentinel を監視
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || isLoadingMore || !oldestCreatedAt) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        if (isLoadingMoreRef.current) return
        if (!hasMore || !oldestCreatedAt) return
        void loadMoreRef.current()
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingMore, oldestCreatedAt])

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
        facilityId={facilityId}
        onPostCreated={handlePostCreated}
      />

      {/* 投稿一覧 */}
      {(isLoading || isGeneratingUrls) && posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-gray-600">
            {isGeneratingUrls ? '添付ファイルを読み込み中...' : '読み込み中...'}
          </p>
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
          {/* 追加読み込みトリガー */}
          <div ref={sentinelRef} />
          {isLoadingMore && (
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-gray-500 text-sm">読み込み中...</p>
            </div>
          )}
        </div>
      ) : !isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">まだこのグループには投稿がありません。</p>
          <p className="text-sm text-gray-500">
            今日の様子や連絡事項を、ここから共有できます。
          </p>
        </div>
      ) : null}
    </div>
  )
}
