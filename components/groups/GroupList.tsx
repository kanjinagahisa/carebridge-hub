'use client'

import { useState, useMemo } from 'react'
import { Search, FolderOpen } from 'lucide-react'
import type { Group } from '@/types/carebridge'
import GroupListItem from './GroupListItem'

interface GroupListProps {
  groups: Group[]
  isAdmin: boolean
}

/**
 * グループ一覧コンポーネント（検索機能付き）
 */
export default function GroupList({ groups, isAdmin }: GroupListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // 検索フィルタリング（name / description を部分一致でフィルタ）
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups
    }

    const query = searchQuery.toLowerCase().trim()
    return groups.filter((group) => {
      // グループ名で検索
      if (group.name?.toLowerCase().includes(query)) {
        return true
      }
      // 説明（memo）で検索
      if (group.description?.toLowerCase().includes(query)) {
        return true
      }
      return false
    })
  }, [groups, searchQuery])

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="グループ名で検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* グループ一覧 */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-2">
          {filteredGroups.map((group) => (
            <GroupListItem key={group.id} group={group} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        // 0件表示メッセージ
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <FolderOpen
            size={48}
            className="mx-auto text-gray-300 mb-3"
          />
          <p className="text-gray-600">
            まだグループが登録されていません。
          </p>
          <p className="text-sm text-gray-500 mt-2">
            管理者の方がグループを作成すると、ここに一覧が表示されます。
          </p>
          {isAdmin && (
            <p className="text-sm text-gray-500 mt-2">
              グループの新規作成は右上のメニューから行えます。
            </p>
          )}
        </div>
      ) : (
        // 検索結果が0件
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">
            「{searchQuery}」に一致するグループが見つかりませんでした。
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-primary hover:underline"
          >
            検索をクリア
          </button>
        </div>
      )}
    </div>
  )
}









