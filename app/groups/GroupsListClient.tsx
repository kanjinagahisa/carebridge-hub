"use client"

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Group = {
  id: string
  name: string
  type?: string | null
  description?: string | null
  updated_at?: string | null
  created_at?: string | null
  deleted?: boolean | null
}

type GroupsApiResponse = {
  facility_id?: string | null
  groups?: Group[]
}

export default function GroupsListClient() {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [type, setType] = useState<string>('general')
  const [description, setDescription] = useState<string>('')

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/groups', { credentials: 'include' })

      if (!response.ok) {
        throw new Error(`取得に失敗しました (${response.status})`)
      }

      const data = (await response.json()) as GroupsApiResponse
      const list = Array.isArray(data?.groups) ? data.groups : []
      setGroups(list)
    } catch (error) {
      console.error('[GroupsListClient] Failed to load groups:', error)
      const message =
        error instanceof Error ? error.message : 'グループの取得に失敗しました。'
      setErrorMessage(message)
      setGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setType('general')
    setDescription('')
    setCreateError(null)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setCreateError(null)
  }, [])

  const handleCreateGroup = useCallback(async () => {
    if (!name.trim()) {
      setCreateError('グループ名を入力してください。')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          type: type.trim() || 'general',
          description: description.trim() || null,
        }),
      })

      if (!response.ok) {
        let errorDetail = ''
        try {
          const data = await response.json()
          errorDetail = data?.error ? `: ${data.error}` : ''
        } catch {
          errorDetail = ''
        }
        throw new Error(`作成に失敗しました (${response.status})${errorDetail}`)
      }

      handleCloseModal()
      resetForm()
      setSuccessMessage('グループを作成しました。')
      await loadGroups()

      window.setTimeout(() => {
        setSuccessMessage((current) =>
          current === 'グループを作成しました。' ? null : current
        )
      }, 3000)
    } catch (error) {
      console.error('[GroupsListClient] Failed to create group:', error)
      const message =
        error instanceof Error ? error.message : '作成に失敗しました。'
      setCreateError(message)
    } finally {
      setIsCreating(false)
    }
  }, [description, handleCloseModal, loadGroups, name, resetForm, type])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  return (
    <div className="relative">
      {successMessage ? (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-green-700 hover:text-green-900"
          >
            閉じる
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">所属グループ一覧</h2>
          <button
            type="button"
            onClick={loadGroups}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            再読み込み
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : groups && groups.length === 0 ? (
          <p className="text-sm text-gray-500">まだグループがありません</p>
        ) : (
          <div className="grid gap-3">
            {(groups ?? []).map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {group.name}
                    </p>
                    {group.description ? (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {group.description}
                      </p>
                    ) : null}
                  </div>
                  {group.type ? (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {group.type}
                    </span>
                  ) : null}
                </div>
                {group.updated_at ? (
                  <p className="mt-2 text-[11px] text-gray-400">
                    更新日: {new Date(group.updated_at).toLocaleDateString()}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setIsModalOpen(true)
          setCreateError(null)
        }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-30 text-2xl"
        aria-label="グループ作成"
      >
        ＋
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">グループ作成</h3>
            </div>
            <div className="px-4 py-4 space-y-3">
              <label className="block">
                <span className="text-xs text-gray-600">グループ名（必須）</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="例: ケアチームA"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">タイプ</span>
                <input
                  type="text"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="general"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">説明（任意）</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="グループの概要を書いてください"
                />
              </label>
              {createError ? (
                <p className="text-xs text-red-600">{createError}</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900"
                disabled={isCreating}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="px-4 py-2 text-xs rounded-md bg-primary text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? '作成中…' : '作成'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
