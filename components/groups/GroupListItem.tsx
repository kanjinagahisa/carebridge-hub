'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Group } from '@/types/carebridge'
import { getClientInitials } from '@/lib/utils/client'

interface GroupListItemProps {
  group: Group
}

/**
 * グループ一覧アイテムコンポーネント（MCS寄せの1行型）
 * 左：丸アイコン（イニシャル）、中央：name（太字）+ description（薄い2行目）、右端：＞
 */
export default function GroupListItem({ group }: GroupListItemProps) {
  const initials = getClientInitials(group.name)

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-white rounded-xl shadow-sm p-4 hover:bg-gray-50 transition-colors min-h-[56px]"
    >
      <div className="flex items-center gap-4">
        {/* 左：丸アイコン（イニシャル） */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-600 font-medium text-sm">
            {initials}
          </span>
        </div>

        {/* 中央：name（太字）+ description（薄い2行目） */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>

        {/* 右端：＞ */}
        <ChevronRight
          size={20}
          className="text-gray-400 flex-shrink-0"
        />
      </div>
    </Link>
  )
}









