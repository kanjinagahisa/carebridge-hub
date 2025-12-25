/**
 * Web Push通知送信API
 * POST: 投稿作成時に通知を送信
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotificationsToFacility } from '@/lib/server/push'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('[push/notify][POST] start')

    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log('[push/notify][POST] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { postId, clientId } = body

    if (!postId || !clientId) {
      return NextResponse.json(
        { error: 'postId and clientId are required' },
        { status: 400 }
      )
    }

    // 投稿情報を取得
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, client_id, body, created_at')
      .eq('id', postId)
      .eq('client_id', clientId)
      .single()

    if (postError || !post) {
      console.error('[push/notify][POST] Failed to fetch post:', postError)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // 利用者情報を取得
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, facility_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('[push/notify][POST] Failed to fetch client:', clientError)
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 投稿者情報を取得
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', post.author_id)
      .single()

    if (authorError || !author) {
      console.error('[push/notify][POST] Failed to fetch author:', authorError)
      // 投稿者情報が取得できなくても通知は送信する（名前は「不明なユーザー」にする）
    }

    const actorName = author?.display_name || '不明なユーザー'
    const clientName = client.name

    // 通知ペイロードを作成
    const payload = {
      title: 'CareBridge Hub｜新着投稿',
      body: `${actorName}さんが「${clientName}」さんのタイムラインに投稿しました`,
      url: `/clients/${clientId}/timeline`,
    }

    // 通知を送信
    console.log('[push/notify][POST] Sending notifications to facility:', client.facility_id)
    const result = await sendPushNotificationsToFacility(
      client.facility_id,
      post.author_id,
      payload
    )

    console.log('[push/notify][POST] Notification send result:', result)

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[push/notify][POST] Unexpected error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

