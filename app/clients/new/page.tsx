'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createClient as createClientAPI, type CreateClientPayload } from '@/lib/api/clients'

/**
 * 新しい利用者を追加するページ
 */
export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [facilityName, setFacilityName] = useState<string>('')
  
  const [formData, setFormData] = useState({
    name: '',
    kana: '',
    date_of_birth: '',
    memo: '',
  })

  // ユーザーの施設IDを取得
  useEffect(() => {
    loadUserFacility()
  }, [])

  const loadUserFacility = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('ログインが必要です。')
        setIsLoading(false)
        return
      }

      // ユーザーの所属施設を取得
      const { data: userFacilities, error: facilitiesError } = await supabase
        .from('user_facility_roles')
        .select('facility_id, facilities(name)')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .limit(1)

      if (facilitiesError) {
        console.error('Error fetching user facilities:', facilitiesError)
        setError('施設情報の取得に失敗しました。')
        setIsLoading(false)
        return
      }

      if (!userFacilities || userFacilities.length === 0) {
        setError('所属施設が見つかりませんでした。')
        setIsLoading(false)
        return
      }

      const facility = userFacilities[0]
      setFacilityId(facility.facility_id)
      
      // 施設名を取得
      const facilityData = facility.facilities as { name?: string } | { name?: string }[] | null | undefined
      const name = Array.isArray(facilityData)
        ? facilityData[0]?.name
        : (facilityData as { name?: string } | null | undefined)?.name
      setFacilityName(name || '')

      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load user facility:', err)
      setError('施設情報の取得に失敗しました。')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!facilityId) {
      setError('施設情報が取得できていません。')
      return
    }

    if (!formData.name.trim()) {
      setError('利用者名は必須です。')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const payload: CreateClientPayload = {
        facility_id: facilityId,
        name: formData.name.trim(),
        kana: formData.kana.trim() || null,
        date_of_birth: formData.date_of_birth.trim() || null,
        memo: formData.memo.trim() || null,
      }

      const newClient = await createClientAPI(payload)
      
      // 作成成功時、利用者一覧に戻る
      router.push('/clients')
    } catch (err: any) {
      console.error('Failed to create client:', err)
      setError(
        err?.message || '利用者の作成に失敗しました。もう一度お試しください。'
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ローディング状態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/clients" className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しい利用者を追加</h1>
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
  if (error && !facilityId) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/clients" className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しい利用者を追加</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-gray-600">{error}</p>
            <Link
              href="/clients"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              利用者一覧に戻る
            </Link>
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
            <Link href="/clients" className="p-2 -ml-2 flex items-center gap-1">
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しい利用者を追加</h1>
            <div className="w-24" /> {/* 戻るボタンとバランスを取る */}
          </div>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 基本情報カード */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">基本情報</h2>

            {/* 氏名（必須） */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="利用者名"
                required
                disabled={isSaving}
              />
            </div>

            {/* カナ */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">カナ</label>
              <input
                type="text"
                value={formData.kana}
                onChange={(e) => setFormData({ ...formData, kana: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="フリガナ"
                disabled={isSaving}
              />
            </div>

            {/* 生年月日 */}
            <div>
              <label className="block text-sm text-slate-600 mb-1">生年月日</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* メモカード */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              メモ（医療情報・支援メモなど）
            </h2>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="既往歴、アレルギー、服薬、支援のコツ など&#10;現場で共有したい情報を自由に記載できます。"
              rows={8}
              disabled={isSaving}
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <Link
              href="/clients"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-center"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                '保存中...'
              ) : (
                <>
                  <Check size={16} />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

