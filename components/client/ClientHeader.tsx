'use client'

import type { Client } from '@/types/carebridge'
import { getClientInitials, calculateAge, formatDate } from '@/lib/utils/client'

interface ClientHeaderProps {
  client: Client
}

/**
 * 利用者ヘッダーコンポーネント
 * Avatar、名前、カナ、生年月日/年齢を表示
 */
export default function ClientHeader({ client }: ClientHeaderProps) {
  const age = calculateAge(client.date_of_birth)
  const initials = getClientInitials(client.name)
  const formattedDate = formatDate(client.date_of_birth)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {client.photo_url ? (
          <img
            src={client.photo_url}
            alt={client.name}
            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-semibold text-2xl">
              {initials}
            </span>
          </div>
        )}

        {/* 名前・カナ・生年月日 */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {client.name}
          </h1>
          {client.kana && (
            <p className="text-sm text-gray-500 mb-2">{client.kana}</p>
          )}
          {client.date_of_birth && (
            <p className="text-sm text-gray-600">
              {formattedDate}
              {age !== null && `（${age}歳）`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}









