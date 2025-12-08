'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Plus, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import type { Client } from '@/types/carebridge'

interface ClientsListClientProps {
  initialClients: Client[]
  facilityName?: string
  error?: any
  clientPostsMap?: Record<string, any>
  unreadCountsMap?: Record<string, number>
  currentUserId?: string
}

/**
 * 利用者一覧のクライアントコンポーネント
 * 検索・フィルタリング機能を提供
 */
export default function ClientsListClient({
  initialClients,
  facilityName,
  error: initialError,
  clientPostsMap = {},
  unreadCountsMap = {},
  currentUserId,
}: ClientsListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(initialError)

  // デバッグログ
  console.log('[ClientsListClient] Render:', {
    clientsCount: initialClients?.length || 0,
    facilityName,
    hasError: !!error,
  })

  // 検索フィルタリング
  const filteredClients = useMemo(() => {
    const clients = initialClients || []
    if (!searchQuery.trim()) {
      return clients
    }

    const query = searchQuery.toLowerCase().trim()
    return clients.filter((client) => {
      // 利用者名で検索
      if (client.name?.toLowerCase().includes(query)) {
        return true
      }
      // フリガナで検索
      if (client.kana?.toLowerCase().includes(query)) {
        return true
      }
      // メモで検索
      if (client.memo?.toLowerCase().includes(query)) {
        return true
      }
      return false
    })
  }, [initialClients, searchQuery])

  // 初期レンダリング時の確認
  if (initialClients === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  // 利用者のイニシャル（頭文字）を取得
  const getInitials = (name: string): string => {
    if (!name) return '?'
    // 日本語の場合は最初の1文字、英語の場合は最初の2文字
    const firstChar = name[0]
    if (/[a-zA-Z]/.test(firstChar)) {
      return name.substring(0, 2).toUpperCase()
    }
    return firstChar
  }

  // 利用者の2行目のテキストを生成（最新投稿の要約）
  const getSecondaryText = (client: Client): { text: string; postDate?: string; isUnread: boolean } => {
    const latestPost = clientPostsMap[client.id]
    const unreadCount = unreadCountsMap[client.id] || 0

    if (latestPost) {
      // 最新投稿の本文の冒頭1〜2行を表示
      const bodyPreview = latestPost.body
        ? (latestPost.body.length > 50
            ? latestPost.body.substring(0, 50) + '...'
            : latestPost.body)
        : ''
      
      const postDate = latestPost.created_at
        ? format(new Date(latestPost.created_at), 'MM/dd HH:mm', { locale: ja })
        : undefined

      return {
        text: bodyPreview || '投稿があります',
        postDate,
        isUnread: unreadCount > 0,
      }
    }

    // 投稿がない場合はメモを表示
    if (client.memo) {
      const memoPreview = client.memo.length > 30
        ? client.memo.substring(0, 30) + '...'
        : client.memo
      return { text: memoPreview, isUnread: false }
    }
    
    if (client.date_of_birth) {
      return { text: `生年月日：${client.date_of_birth}`, isUnread: false }
    }
    
    return { text: 'メモはまだ登録されていません', isUnread: false }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* ページヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          {facilityName && (
            <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">利用者</h1>
            {/* 将来的なメニュー用のスペース（v1では未実装） */}
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="利用者名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* エラー時の表示 */}
        {error && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-gray-600">
              利用者の情報を読み込めませんでした。
            </p>
            <p className="text-sm text-gray-500">
              通信環境をご確認のうえ、もう一度お試しください。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        )}

        {/* 利用者一覧 */}
        {!error && (
          <>
            {filteredClients.length > 0 ? (
              <div className="space-y-2">
                {filteredClients.map((client) => {
                  const secondaryInfo = getSecondaryText(client)
                  const unreadCount = unreadCountsMap[client.id] || 0

                  return (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}/timeline`}
                      className="block bg-white rounded-xl shadow-sm p-4 hover:bg-gray-50 transition-colors min-h-[56px]"
                    >
                      <div className="flex items-center gap-4">
                        {/* アイコン（顔写真 or イニシャル） */}
                        <div className="relative flex-shrink-0">
                          {client.photo_url ? (
                            <img
                              src={client.photo_url}
                              alt={client.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-medium text-sm">
                                {getInitials(client.name)}
                              </span>
                            </div>
                          )}
                          {/* 未読バッジ */}
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-white font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* テキスト2行 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {client.name}
                            </h3>
                            {/* 未読バッジ（テキスト横） */}
                            {secondaryInfo.isUnread && unreadCount === 0 && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-sm line-clamp-1 flex-1 ${
                              secondaryInfo.isUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                            }`}>
                              {secondaryInfo.text}
                            </p>
                            {secondaryInfo.postDate && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {secondaryInfo.postDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 右端の矢印 */}
                        <ChevronRight
                          size={20}
                          className="text-gray-400 flex-shrink-0"
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
                {searchQuery.trim() ? (
                  <>
                    <p className="text-gray-600">
                      「{searchQuery}」に一致する利用者が見つかりませんでした。
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-sm text-primary hover:underline"
                    >
                      検索をクリア
                    </button>
                  </>
                ) : (
                  <>
                    <FolderOpen
                      size={48}
                      className="mx-auto text-gray-300 mb-3"
                    />
                    <p className="text-gray-600">
                      まだ登録されている利用者がいません。
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      右下の「＋」ボタンから新しい利用者を追加できます。
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* 「新しい利用者を追加」ボタン（FAB） */}
        {!error && (
          <Link
            href="/clients/new"
            className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-30"
            aria-label="新しい利用者を追加"
          >
            <Plus size={24} />
          </Link>
        )}
      </div>
    </div>
  )
}

