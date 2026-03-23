'use client'

import { useState } from 'react'
import { PROFESSION_LABELS } from '@/lib/constants'

type Member = {
  role: string
  user: { id: string; display_name: string | null; profession: string | null } | null
}

export default function MembersSearch({ members }: { members: Member[] }) {
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const filtered = trimmed
    ? members.filter((m) => (m.user?.display_name ?? '').includes(trimmed))
    : members

  return (
    <div className="p-4 space-y-2">
      <div className="bg-white rounded-xl shadow-sm px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前で検索"
          className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            {trimmed ? '該当するメンバーがいません。' : 'メンバーがいません。'}
          </p>
        </div>
      ) : (
        filtered.map((m) => {
          const profLabel =
            PROFESSION_LABELS[m.user?.profession ?? ''] ||
            m.user?.profession ||
            ''
          return (
            <div
              key={m.user?.id}
              className="bg-white rounded-xl shadow-sm px-4 py-3"
            >
              <p className="text-sm font-medium text-gray-900">
                {m.user?.display_name || '名前なし'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {[profLabel, m.role].filter(Boolean).join(' · ')}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}
