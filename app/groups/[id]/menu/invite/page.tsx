'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Check } from 'lucide-react'
import { PROFESSION_LABELS } from '@/lib/constants'

type Candidate = {
  id: string
  display_name: string | null
  profession: string | null
}

/**
 * グループ招待（/groups/[id]/menu/invite）
 * 施設所属済み・グループ未所属のメンバーを複数選択して招待する。
 */
export default function GroupInvitePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // 施設の全メンバー と 現グループのメンバーを並行取得し、未所属候補を絞り込む
        const [facRes, memberRes] = await Promise.all([
          fetch('/api/groups/invite-candidates', { credentials: 'include' }),
          fetch(`/api/groups/members?groupId=${id}`, { credentials: 'include' }),
        ])
        if (!facRes.ok || !memberRes.ok) {
          setLoadError('メンバー情報の取得に失敗しました')
          return
        }
        const facData = await facRes.json()
        const memberData = await memberRes.json()

        const memberIds = new Set<string>(
          (memberData.members ?? []).map((m: any) => m.id as string)
        )
        const filtered = (facData.candidates ?? []).filter(
          (c: any) => !memberIds.has(c.id)
        ) as Candidate[]
        setCandidates(filtered)
      } catch (e) {
        console.error('[GroupInvitePage] load error', e)
        setLoadError('メンバー情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const handleInvite = async () => {
    if (selected.size === 0) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/groups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId: id, userIds: [...selected] }),
      })
      if (!res.ok) {
        const j = await res.json()
        setErrorMsg(j.error ?? '招待に失敗しました')
        return
      }
      setSuccessMsg('招待しました')
      setTimeout(() => router.push(`/groups/${id}/menu`), 1000)
    } catch (e) {
      console.error('[GroupInvitePage] handleInvite error', e)
      setErrorMsg('招待に失敗しました。通信状態を確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/groups/${id}/menu`}
              className="p-2 -ml-2 flex items-center gap-1"
            >
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">招待</h1>
            <button
              disabled={selected.size === 0 || submitting}
              onClick={handleInvite}
              className="text-sm font-medium text-blue-600 disabled:text-gray-400 pr-1"
            >
              招待
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm px-4 py-8 text-center">
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        ) : loadError ? null : candidates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm px-4 py-8 text-center">
            <p className="text-sm text-gray-500">招待できるメンバーがいません。</p>
          </div>
        ) : (
          candidates.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-50"
              onClick={() => toggle(c.id)}
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {c.display_name || '名前なし'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PROFESSION_LABELS[c.profession ?? ''] || c.profession || ''}
                </p>
              </div>
              {selected.has(c.id) && (
                <Check size={18} className="text-blue-600 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
