'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { Client } from '@/types/carebridge'
import { fetchClientById } from '@/lib/api/clients'
import ClientHeader from '@/components/client/ClientHeader'
import ClientBasicInfoCard from '@/components/client/ClientBasicInfoCard'
import ClientMemoCard from '@/components/client/ClientMemoCard'
import ClientDocumentsCard from '@/components/client/ClientDocumentsCard'
import { createClient } from '@/lib/supabase/client'

/**
 * 利用者プロフィールページ（/clients/[id]/profile）
 * 利用者の詳細情報を表示・編集
 */
export default function ClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [facilityName, setFacilityName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 利用者情報と施設名を取得
  useEffect(() => {
    loadClient()
  }, [clientId])

  const loadClient = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 利用者情報を取得
      const clientData = await fetchClientById(clientId)

      if (!clientData) {
        setError('利用者が見つかりませんでした。')
        setIsLoading(false)
        return
      }

      setClient(clientData)

      // 施設名を取得
      const supabase = createClient()
      const { data: facility } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', clientData.facility_id)
        .eq('deleted', false)
        .maybeSingle()

      if (facility) {
        setFacilityName(facility.name)
      }
    } catch (err) {
      console.error('Failed to load client:', err)
      setError('利用者の情報を読み込めませんでした。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientUpdate = (updatedClient: Client) => {
    setClient(updatedClient)
  }

  // ローディング状態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href={`/clients/${clientId}/timeline`} className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">プロフィール詳細</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href={`/clients/${clientId}/timeline`} className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">プロフィール詳細</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-gray-600">
              {error || '利用者の情報を読み込めませんでした。'}
            </p>
            <button
              onClick={() => router.push('/clients')}
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              利用者一覧に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 正常表示
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* ページヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          {facilityName && (
            <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
          )}
          <div className="flex items-center justify-between">
            <Link href={`/clients/${clientId}/timeline`} className="p-2 -ml-2 flex items-center gap-1">
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">タイムラインへ</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">プロフィール詳細</h1>
            <div className="w-24" /> {/* 戻るボタンとバランスを取る */}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 利用者ヘッダー */}
        <ClientHeader client={client} />

        {/* 基本情報 */}
        <ClientBasicInfoCard client={client} onUpdate={handleClientUpdate} />

        {/* メモ */}
        <ClientMemoCard client={client} onUpdate={handleClientUpdate} />

        {/* 書類 */}
        <ClientDocumentsCard client={client} />
      </div>
    </div>
  )
}





