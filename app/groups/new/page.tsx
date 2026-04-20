'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type InviteCandidate = {
  id: string
  display_name: string | null
  email: string | null
  profession: string | null
  avatar_url: string | null
  role: string
}

/**
 * 新しいグループを作成するページ（/clients/new の UI を踏襲）
 */
export default function NewGroupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [facilityName, setFacilityName] = useState<string>('')
  const [candidates, setCandidates] = useState<InviteCandidate[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null)

  useEffect(() => {
    loadUserAndCandidates()
  }, [])

  const loadUserAndCandidates = async () => {
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

      setUserId(user.id)

      const { data: userFacilities, error: facilitiesError } = await supabase
        .from('user_facility_roles')
        .select('facility_id, created_at, facilities(name)')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)

      if (facilitiesError) {
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

      const facilityData = facility.facilities as { name?: string } | { name?: string }[] | null | undefined
      const name = Array.isArray(facilityData)
        ? facilityData[0]?.name
        : (facilityData as { name?: string } | null | undefined)?.name
      setFacilityName(name || '')

      const res = await fetch('/api/groups/invite-candidates', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setCandidates(json.candidates ?? [])
      }

      setIsLoading(false)
    } catch {
      setError('読み込みに失敗しました。')
      setIsLoading(false)
    }
  }

  const toggleCandidate = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!facilityId || !userId) {
      setError('施設情報が取得できていません。')
      return
    }
    if (!formData.name.trim()) {
      setError('グループ名は必須です。')
      return
    }

    setIsSaving(true)
    setError(null)
    setMemberError(null)

    try {
      const supabase = createClient()
      const { data: newGroup, error: insertError } = await supabase
        .from('groups')
        .insert({
          facility_id: facilityId,
          type: 'general',
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          created_by: userId,
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message || 'グループの作成に失敗しました。')
        setIsSaving(false)
        return
      }

      if (!newGroup?.id) {
        setError('グループの作成に失敗しました。')
        setIsSaving(false)
        return
      }

      // 作成者本人を必ず group_members に追加
      const { error: ownerMemberErr } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: userId,
      })
      if (ownerMemberErr) {
        setError(ownerMemberErr.message || 'グループの作成に失敗しました。')
        setIsSaving(false)
        return
      }

      const ids = Array.from(selectedUserIds)
      if (ids.length > 0) {
        let anyFailed = false
        for (const uid of ids) {
          const { error: memberErr } = await supabase.from('group_members').insert({
            group_id: newGroup.id,
            user_id: uid,
          })
          if (memberErr) anyFailed = true
        }
        if (anyFailed) {
          setMemberError('メンバー追加に失敗しました。あとで追加してください。')
          setCreatedGroupId(newGroup.id)
          setIsSaving(false)
          return
        }
      }

      router.push(`/groups/${newGroup.id}`)
    } catch {
      setError('グループの作成に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/groups" className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しいグループを作成</h1>
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

  if (error && !facilityId) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/groups" className="p-2">
              <ChevronLeft size={24} className="text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しいグループを作成</h1>
            <div className="w-10" />
          </div>
        </div>
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-gray-600">{error}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/groups"
              className="inline-block ml-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              グループ一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          {facilityName && (
            <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
          )}
          <div className="flex items-center justify-between">
            <Link href="/groups" className="p-2 -ml-2 flex items-center gap-1">
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">新しいグループを作成</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {memberError && createdGroupId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-amber-800">{memberError}</p>
              <Link
                href={`/groups/${createdGroupId}`}
                className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                グループページへ
              </Link>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">基本情報</h2>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                グループ名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="グループ名"
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              説明・メモ（任意）
            </h2>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="グループの説明や共有したいメモを記載できます。"
              rows={4}
              disabled={isSaving}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">メンバー（任意）</h2>
            <p className="text-sm text-gray-500">
              追加するスタッフにチェックを入れてください。
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-gray-500">追加できるスタッフがいません。</p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id={`candidate-${c.id}`}
                      checked={selectedUserIds.has(c.id)}
                      onChange={() => toggleCandidate(c.id)}
                      disabled={isSaving}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={`candidate-${c.id}`}
                      className="text-sm text-slate-700 cursor-pointer flex-1"
                    >
                      {c.display_name || c.email || c.id}
                      {c.profession && (
                        <span className="text-gray-500 ml-1">（{c.profession}）</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Link
              href="/groups"
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
                '作成中...'
              ) : (
                <>
                  <Check size={16} />
                  作成
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
