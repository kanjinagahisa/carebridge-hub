'use client'

import { useEffect, useMemo, useState } from 'react'

type Candidate = {
  user_id: string
  role: string
  users?: { display_name?: string; email?: string } | null
}

export default function FacilityLeaveCard({ facilityId, isAdminUser }: { facilityId: string; isAdminUser: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [blockingGroupIds, setBlockingGroupIds] = useState<string[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [targetUserId, setTargetUserId] = useState<string>('')

  const hasBlocking = blockingGroupIds.length > 0

  const candidateOptions = useMemo(() => {
    return candidates
      .map((c) => {
        const name = c.users?.display_name || c.users?.email || c.user_id
        return { value: c.user_id, label: `${name}${c.role ? `（${c.role}）` : ''}` }
      })
  }, [candidates])

  useEffect(() => {
    if (!hasBlocking) return
    ;(async () => {
      try {
        const res = await fetch('/api/groups/invite-candidates', { method: 'GET' })
        const json = await res.json().catch(() => ({}))
        const list = (json?.candidates ?? json?.data ?? json) as any
        if (Array.isArray(list)) {
          const normalized = list.map((item: any) => ({
            user_id: item.user_id ?? item.id,
            role: item.role ?? '',
            users: {
              display_name: item.users?.display_name ?? item.display_name,
              email: item.users?.email ?? item.email,
            },
          }))
          setCandidates(normalized)
          if (!targetUserId && normalized[0]?.user_id) setTargetUserId(normalized[0].user_id)
        }
      } catch {
        // noop
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBlocking])

  const callLeave = async () => {
    setIsLoading(true)
    setMsg(null)
    setBlockingGroupIds([])

    try {
      const res = await fetch('/api/facility/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json?.ok) {
        const blocks = Array.isArray(json?.blocking_group_ids) ? json.blocking_group_ids : []
        if (blocks.length > 0) {
          setBlockingGroupIds(blocks)
          setMsg('脱退できませんでした。先に「別メンバーを owner に追加」してください。')
        } else {
          setMsg(json?.error || '脱退に失敗しました')
        }
        return
      }

      setMsg('脱退が完了しました。画面を更新します…')
      window.location.href = '/home'
    } finally {
      setIsLoading(false)
    }
  }

  const addOwnerThenLeave = async () => {
    if (!targetUserId) {
      setMsg('owner にするメンバーを選択してください。')
      return
    }
    if (!window.confirm('選択したメンバーを owner に追加してから、脱退を再実行します。よろしいですか？')) {
      return
    }

    setIsLoading(true)
    setMsg(null)

    try {
      const r1 = await fetch('/api/groups/add-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          targetUserId,
          groupIds: blockingGroupIds,
        }),
      })
      const j1 = await r1.json().catch(() => ({}))
      if (!r1.ok || !j1?.ok) {
        setMsg(j1?.error || 'owner 付与に失敗しました')
        return
      }

      await callLeave()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">脱退</h2>
        {isAdminUser && (
          <span className="text-xs text-gray-500">管理者向け</span>
        )}
      </div>

      <p className="text-sm text-gray-600">
        施設から脱退します。あなたが最後の owner の場合は、先に別メンバーへ owner を追加する必要があります。
      </p>

      {msg && (
        <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
          {msg}
        </div>
      )}

      {hasBlocking && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            ブロック中のグループ数：<span className="font-medium">{blockingGroupIds.length}</span>
          </p>

          <label className="block text-sm text-gray-700">
            owner に追加するメンバー
            <select
              className="mt-2 w-full border border-gray-300 rounded-lg p-2 text-sm"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">選択してください</option>
              {candidateOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
            onClick={addOwnerThenLeave}
            disabled={isLoading}
          >
            owner を追加して脱退を再実行
          </button>
        </div>
      )}

      <button
        className="w-full px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
        onClick={() => {
          if (!window.confirm('本当に脱退しますか？')) return
          void callLeave()
        }}
        disabled={isLoading}
      >
        脱退する
      </button>
    </div>
  )
}
