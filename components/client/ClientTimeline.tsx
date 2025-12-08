'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types/carebridge'
import PostCard from '@/components/groups/PostCard'
import ClientPostComposer from './ClientPostComposer'

interface ClientTimelineProps {
  clientId: string
  currentUserId: string
  initialPosts?: Post[]
}

/**
 * 利用者タイムラインコンポーネント
 * 投稿一覧と投稿作成を統合
 */
export default function ClientTimeline({
  clientId,
  currentUserId,
  initialPosts = [],
}: ClientTimelineProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingUrls, setIsGeneratingUrls] = useState(false)

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
        console.error('[ClientTimeline] Failed to fetch existing reads:', selectError)
        console.error('[ClientTimeline] Error details:', {
          message: selectError.message,
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
        })
        return
      }

      const readPostIds = new Set(existingReads?.map((r) => r.post_id) || [])
      const unreadPostIds = postIds.filter((id) => !readPostIds.has(id))

      if (unreadPostIds.length > 0) {
        console.log('[ClientTimeline] Marking posts as read:', unreadPostIds.length, 'posts')
        // 未読の投稿に既読をマーク
        const { data: insertData, error: insertError } = await supabase.from('post_reads').insert(
          unreadPostIds.map((postId) => ({
            post_id: postId,
            user_id: currentUserId,
          }))
        ).select()

        if (insertError) {
          console.error('[ClientTimeline] Failed to mark posts as read:', insertError)
          console.error('[ClientTimeline] Error details:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          })
          if (insertError.code === '42501') { // RLS policy violation
            console.error('[ClientTimeline] RLS policy violation: User may not have permission to mark these posts as read')
            console.error('[ClientTimeline] Post IDs:', unreadPostIds)
            console.error('[ClientTimeline] Current user ID:', currentUserId)
          }
        } else {
          console.log('[ClientTimeline] Successfully marked posts as read:', insertData?.length || 0, 'records')
        }
      }
    } catch (error) {
      console.error('[ClientTimeline] Unexpected error marking posts as read:', error)
    }
  }

  // 投稿一覧を取得
  const loadPosts = async (): Promise<void> => {
    setIsLoading(true)
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
        .eq('client_id', clientId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Failed to load posts:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        // エラーが発生した場合でも既存の投稿を維持する
        return
      }

      // 投稿の作者情報を取得（RLSを考慮して別途取得）
      let loadedPosts = (data as Post[]) || []
      if (loadedPosts && loadedPosts.length > 0) {
        const authorIds = [...new Set(loadedPosts.map((p: any) => p.author_id).filter(Boolean))]
        if (authorIds.length > 0) {
          console.log('[ClientTimeline] Fetching author information for', authorIds.length, 'authors')
          const { data: authors, error: authorsError } = await supabase
            .from('users')
            .select('id, display_name, profession')
            .in('id', authorIds)
            .eq('deleted', false)

          if (authorsError) {
            console.error('[ClientTimeline] Error fetching authors:', authorsError)
          } else {
            console.log('[ClientTimeline] Fetched authors count:', authors?.length || 0)
            // 作者情報をマッピング
            const authorsMap = new Map(authors?.map((a: any) => [a.id, a]) || [])
            loadedPosts = loadedPosts.map((post: any) => ({
              ...post,
              author: authorsMap.get(post.author_id) || null,
            }))
          }
        }
      }
      
      // 添付ファイルの署名付きURLを生成（generateSignedUrls関数を使用）
      let postsWithSignedUrls = loadedPosts
      if (loadedPosts.length > 0) {
        postsWithSignedUrls = await generateSignedUrls(loadedPosts)
      }
      
      // データが取得できた場合のみ投稿を更新
      // 空の配列が返された場合（RLSポリシーの問題の可能性）は既存の投稿を維持
      if (postsWithSignedUrls.length > 0) {
        setPosts(postsWithSignedUrls)
        // 既読をマーク（タイムライン表示時に read を登録）
        await markPostsAsRead(postsWithSignedUrls)
      } else if (data === null || data === undefined) {
        // データが null または undefined の場合、エラーとして扱い既存の投稿を維持
        console.warn('Posts data is null/undefined, keeping existing posts to prevent data loss')
      } else {
        // 空の配列が返された場合、RLSポリシーの問題の可能性があるため既存の投稿を維持
        console.warn('No posts loaded (empty array), but keeping existing posts to prevent data loss. This may indicate an RLS policy issue.')
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
      // エラーが発生した場合でも既存の投稿を維持する
    } finally {
      setIsLoading(false)
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
        console.log(
          `[ClientTimeline] Creating signed URL for attachment ${attachmentId}, attempt ${attempt}/${maxRetries}, storage path: ${storagePath}`
        )
        const { data: urlData, error: urlError } = await supabase.storage
          .from('attachments')
          .createSignedUrl(storagePath, 3600)

        if (urlError) {
          // 404エラーの場合はリトライしない（ファイルが存在しない）
          if ((urlError as any).statusCode === '404' || urlError.message?.includes('not found')) {
            console.error(
              `[ClientTimeline] File not found for attachment ${attachmentId}, storage path: ${storagePath}`
            )
            return null
          }

          // その他のエラーの場合はリトライ
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // 指数バックオフ、最大5秒
            console.warn(
              `[ClientTimeline] Failed to create signed URL for attachment ${attachmentId} (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
              urlError
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          console.error(
            `[ClientTimeline] Failed to create signed URL for attachment ${attachmentId} after ${maxRetries} attempts:`,
            urlError
          )
          return null
        }

        if (urlData?.signedUrl) {
          console.log(`[ClientTimeline] Successfully created signed URL for attachment ${attachmentId}`)
          return urlData.signedUrl
        }

        console.warn(`[ClientTimeline] No signed URL returned for attachment ${attachmentId}`)
        return null
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.warn(
            `[ClientTimeline] Error creating signed URL for attachment ${attachmentId} (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
            error
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        console.error(
          `[ClientTimeline] Error creating signed URL for attachment ${attachmentId} after ${maxRetries} attempts:`,
          error
        )
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

          const updatedAttachments = await Promise.all(
            post.attachments.map(async (attachment) => {
              if (!attachment.file_url) {
                return attachment
              }

              // 既に署名付きURL（http/httpsで始まる）の場合
              // 期限切れの可能性があるため、Storageパスを推測して再生成を試みる
              if (attachment.file_url.startsWith('http://') || attachment.file_url.startsWith('https://')) {
                try {
                  const urlObj = new URL(attachment.file_url)
                  const pathMatch = urlObj.pathname.match(/\/object\/sign\/attachments\/(.+)/)
                  if (pathMatch && pathMatch[1]) {
                    const storagePath = decodeURIComponent(pathMatch[1].split('?')[0])
                    // Storageパスから新しい署名付きURLを生成（リトライ付き）
                    const signedUrl = await createSignedUrlWithRetry(
                      supabase,
                      storagePath,
                      attachment.id
                    )
                    if (signedUrl) {
                      return { ...attachment, file_url: signedUrl }
                    }
                  }
                  // パス抽出に失敗した場合、既存のURLをそのまま使用
                  console.warn(
                    `[ClientTimeline] Could not extract storage path from signed URL for attachment ${attachment.id}, using existing URL`
                  )
                  return attachment
                } catch (error) {
                  console.error(
                    `[ClientTimeline] Error processing existing signed URL for attachment ${attachment.id}:`,
                    error
                  )
                  // エラーが発生した場合、既存のURLをそのまま使用
                  return attachment
                }
              }

              // Storageパスから署名付きURLを生成（リトライ付き）
              const signedUrl = await createSignedUrlWithRetry(
                supabase,
                attachment.file_url,
                attachment.id
              )

              if (signedUrl) {
                return { ...attachment, file_url: signedUrl }
              } else {
                console.warn(
                  `[ClientTimeline] Could not generate signed URL for attachment ${attachment.id}, setting file_url to null`
                )
                return { ...attachment, file_url: null as any }
              }
            })
          )

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
      setIsLoading(true)
      try {
        if (initialPosts.length === 0) {
          await loadPosts()
        } else {
          // initialPostsが渡された場合でも、署名付きURLを生成する
          console.log('[ClientTimeline] Generating signed URLs for initial posts:', initialPosts.length)
          const postsWithSignedUrls = await generateSignedUrls(initialPosts)
          setPosts(postsWithSignedUrls)
          // 初期表示時にも既読処理を実行
          await markPostsAsRead(postsWithSignedUrls)
        }
      } catch (error) {
        console.error('[ClientTimeline] Error initializing posts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    initializePosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // 投稿作成後のコールバック
  const handlePostCreated = () => {
    loadPosts()
  }

  // いいね変更後のコールバック
  // スクロール位置を維持しながら投稿を再読み込み
  const handleReactionChange = async () => {
    const scrollPosition = window.scrollY
    const currentPosts = posts // 現在の投稿を保存
    try {
      await loadPosts()
      // 投稿読み込み後にスクロール位置を復元
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition)
      })
    } catch (error) {
      console.error('Failed to reload posts after reaction change:', error)
      // エラーが発生した場合、既存の投稿を維持
      setPosts(currentPosts)
      // スクロール位置を復元
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition)
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* 投稿作成エリア */}
      <ClientPostComposer
        clientId={clientId}
        currentUserId={currentUserId}
        onPostCreated={handlePostCreated}
      />

      {/* 投稿一覧 */}
      {isLoading || isGeneratingUrls ? (
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
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">まだこの利用者には投稿がありません。</p>
          <p className="text-sm text-gray-500">
            今日の様子や連絡事項を、ここから共有できます。
          </p>
        </div>
      )}
    </div>
  )
}



