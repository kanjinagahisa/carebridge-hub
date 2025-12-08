import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, User } from 'lucide-react'
import type { Client, Post } from '@/types/carebridge'
import ClientTimeline from '@/components/client/ClientTimeline'
import { getClientInitials } from '@/lib/utils/client'

/**
 * 利用者タイムラインページ（/clients/[id]/timeline）
 * Server Component として実装
 */
export default async function ClientTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  console.log('[ClientTimelinePage] Starting for client ID:', id)

  try {
    const supabase = await createClient()
    console.log('[ClientTimelinePage] Supabase client created')

    // Cookieからセッションを明示的に設定を試みる（ミドルウェアと同じ処理）
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const authCookies = cookieStore.getAll().filter((cookie) =>
      cookie.name.includes('sb-') || cookie.name.includes('auth-token')
    )

    let user: any = null

    if (authCookies.length > 0) {
      const authTokenCookie = authCookies.find((c) => c.name.includes('auth-token'))
      if (authTokenCookie && authTokenCookie.value) {
        try {
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            console.log('[ClientTimelinePage] Cookie value URL decoded')
          }

          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[ClientTimelinePage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
              if (setSessionError) {
                console.error(
                  '[ClientTimelinePage] Error setting session from cookie:',
                  setSessionError.message
                )
              } else if (setSessionData?.user) {
                console.log(
                  '[ClientTimelinePage] Session set from cookie successfully, user:',
                  setSessionData.user.email
                )
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[ClientTimelinePage] Error processing cookie value:', err)
        }
      }
    }

    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      if (getUserError || !getUserResult) {
        console.log('[ClientTimelinePage] No user found, redirecting to login')
        redirect('/login')
      }

      user = getUserResult
    }

    console.log('[ClientTimelinePage] User authenticated:', user.id, user.email)

    // Storageアクセスのためにセッションが正しく設定されているか確認
    const { data: { session: storageSession }, error: storageSessionError } = await supabase.auth.getSession()
    if (storageSessionError || !storageSession) {
      console.warn('[ClientTimelinePage] Storage access: Session not found or error, attempting to re-set session.')
      console.warn('[ClientTimelinePage] Session error details:', {
        hasError: !!storageSessionError,
        errorMessage: storageSessionError?.message,
        hasSession: !!storageSession,
      })
      // セッションがない場合、Cookieから再度取得を試みる
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const authTokenCookie = cookieStore.get('sb-nwszimmkjrkzddypegzy-auth-token') || 
                             cookieStore.getAll().find((c) => c.name.includes('auth-token'))
      
      if (authTokenCookie?.value) {
        try {
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
          }
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              const { data: reSetSessionData, error: reSetSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              });
              if (reSetSessionError) {
                console.error('[ClientTimelinePage] Failed to re-set session for Storage access:', reSetSessionError.message);
              } else if (reSetSessionData?.session) {
                console.log('[ClientTimelinePage] Session re-set successfully for Storage access.');
              }
            }
          }
        } catch (err) {
          console.error('[ClientTimelinePage] Error re-setting session from cookie:', err);
        }
      }
    } else {
      console.log('[ClientTimelinePage] Session confirmed for Storage access.');
      console.log('[ClientTimelinePage] Session details:', {
        hasAccessToken: !!storageSession.access_token,
        hasRefreshToken: !!storageSession.refresh_token,
        userId: storageSession.user?.id,
      })
    }

    // adminSupabaseクライアントを使用してRLSをバイパス
    const adminSupabase = createAdminClient()

    // 利用者情報を取得
    console.log('[ClientTimelinePage] Fetching client with admin client for client ID:', id)
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*, facilities(name)')
      .eq('id', id)
      .eq('deleted', false)
      .single()

    if (clientError || !client) {
      console.error('[ClientTimelinePage] Error fetching client:', clientError)
      notFound()
    }

    const facility = Array.isArray(client.facilities) ? client.facilities[0] : client.facilities
    const facilityName = facility?.name || ''

    console.log('[ClientTimelinePage] Fetched client:', client.name)

    // 投稿を取得（利用者タイムライン投稿のみ）
    console.log('[ClientTimelinePage] Fetching posts with admin client for client ID:', id)
    const { data: posts, error: postsError } = await adminSupabase
      .from('posts')
      .select(`
        *,
        reactions:post_reactions(*),
        reads:post_reads(user_id),
        attachments(*)
      `)
      .eq('client_id', id)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (postsError) {
      console.error('[ClientTimelinePage] Error fetching posts:', postsError)
    }
    console.log('[ClientTimelinePage] Fetched posts count:', posts?.length || 0)

    // 投稿の作者情報を取得（adminSupabaseで直接取得してRLSをバイパス）
    let postsWithAuthors = posts || []
    if (posts && posts.length > 0) {
      const authorIds = [...new Set(posts.map((p: any) => p.author_id).filter(Boolean))]
      if (authorIds.length > 0) {
        console.log('[ClientTimelinePage] Fetching author information for', authorIds.length, 'authors')
        const { data: authors, error: authorsError } = await adminSupabase
          .from('users')
          .select('id, display_name, profession')
          .in('id', authorIds)
          .eq('deleted', false)

        if (authorsError) {
          console.error('[ClientTimelinePage] Error fetching authors:', authorsError)
        } else {
          console.log('[ClientTimelinePage] Fetched authors count:', authors?.length || 0)
          // 作者情報をマッピング
          const authorsMap = new Map(authors?.map((a: any) => [a.id, a]) || [])
          postsWithAuthors = posts.map((post: any) => ({
            ...post,
            author: authorsMap.get(post.author_id) || null,
          }))
        }
      }
    }

    // 添付ファイルのfile_urlを正規化（署名付きURLの場合はStorageパスに変換）
    // 署名付きURLの生成は Client Component 側で行う（セッションが確実に利用可能なため）
    if (postsWithAuthors && postsWithAuthors.length > 0) {
      for (const post of posts) {
        if (post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0) {
          for (const attachment of post.attachments) {
            if (attachment.file_url) {
              // 既に署名付きURL（http/httpsで始まる）の場合、Storageパスに変換
              if (attachment.file_url.startsWith('http://') || attachment.file_url.startsWith('https://')) {
                try {
                  const urlObj = new URL(attachment.file_url)
                  // パス名からStorageパスを抽出
                  // /storage/v1/object/sign/attachments/{path} の形式
                  const pathMatch = urlObj.pathname.match(/\/object\/sign\/attachments\/(.+)/)
                  if (pathMatch && pathMatch[1]) {
                    const storagePath = decodeURIComponent(pathMatch[1].split('?')[0]) // クエリパラメータを除去し、URLデコード
                    // Storageパスに変換（Client Component 側で署名付きURLを生成する）
                    attachment.file_url = storagePath
                    console.log(`[ClientTimelinePage] Converted signed URL to storage path for attachment ${attachment.id}: ${storagePath}`)
                  } else {
                    console.warn(
                      `[ClientTimelinePage] Could not extract storage path from signed URL for attachment ${attachment.id}, keeping original URL`
                    )
                  }
                } catch (error) {
                  console.error(
                    `[ClientTimelinePage] Error processing signed URL for attachment ${attachment.id}:`,
                    error
                  )
                  // エラーが発生した場合、file_urlをそのまま保持（Client Component 側で処理）
                }
              }
              // Storageパスの場合はそのまま保持（Client Component 側で署名付きURLを生成する）
            }
          }
        }
      }
    }

            // タイムラインを開いた時点で既読を登録（Server Componentで実行）
            // adminSupabaseを使用してRLSをバイパス（既読処理は認証済みユーザーが自分の施設の投稿に対して行うため安全）
            if (postsWithAuthors && postsWithAuthors.length > 0) {
              const postsToMarkRead = postsWithAuthors
                .filter((post) => !post.reads?.some((r: any) => r.user_id === user.id))
                .map((post) => ({
                  post_id: post.id,
                  user_id: user.id,
                  read_at: new Date().toISOString(),
                }))

              if (postsToMarkRead.length > 0) {
                console.log('[ClientTimelinePage] Marking posts as read:', postsToMarkRead.length)
                const { data: readData, error: readError } = await adminSupabase
                  .from('post_reads')
                  .insert(postsToMarkRead)
                  .select()
                
                if (readError) {
                  console.error('[ClientTimelinePage] Error marking posts as read:', readError)
                  console.error('[ClientTimelinePage] Error details:', {
                    message: readError.message,
                    code: readError.code,
                    details: readError.details,
                    hint: readError.hint,
                  })
                } else {
                  console.log('[ClientTimelinePage] Successfully marked posts as read:', readData?.length || 0, 'records')
                }
              }
            }

    const initials = getClientInitials(client.name)

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* ヘッダー */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2">
            {facilityName && (
              <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
            )}
            <div className="flex items-center justify-between">
              <Link href="/clients" className="p-2 -ml-2 flex items-center gap-1">
                <ChevronLeft size={20} className="text-gray-600" />
                <span className="text-sm text-gray-600">利用者一覧へ</span>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center -ml-8">
                {client.name}
              </h1>
              {/* プロフィール詳細ボタン */}
              <Link
                href={`/clients/${id}/profile`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="プロフィール詳細"
              >
                <User size={20} className="text-gray-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* 利用者アイコンとプロフィール詳細ボタン */}
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {client.photo_url ? (
                <img
                  src={client.photo_url}
                  alt={client.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 font-semibold text-xl">
                    {initials}
                  </span>
                </div>
              )}

              {/* 名前とプロフィール詳細ボタン */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {client.name}
                </h2>
                {client.kana && (
                  <p className="text-sm text-gray-500 mb-2">{client.kana}</p>
                )}
                <Link
                  href={`/clients/${id}/profile`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <User size={16} />
                  プロフィール詳細
                </Link>
              </div>
            </div>
          </div>

          {/* タイムライン */}
          <ClientTimeline
            clientId={id}
            currentUserId={user.id}
            initialPosts={postsWithAuthors as Post[] || []}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('[ClientTimelinePage] Unexpected error:', error)
    redirect('/login')
  }
}



