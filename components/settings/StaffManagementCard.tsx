'use client'

import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'

interface StaffMember {
  user_id: string
  role: string
  users: {
    display_name: string
    email: string
  } | null
}

interface StaffManagementCardProps {
  staffMembers: StaffMember[]
  facilityId: string
}

export default function StaffManagementCard({
  staffMembers,
  facilityId,
}: StaffManagementCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">スタッフ管理</h2>
      </div>

      {staffMembers.length > 0 ? (
        <div className="space-y-2 mb-4">
          {staffMembers.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {member.users?.display_name || '不明なユーザー'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {member.users?.email || ''}
                </p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                {ROLE_LABELS[member.role] || member.role}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic text-center py-4 mb-4">
          まだスタッフが登録されていません。
        </div>
      )}

      <Link
        href={`/settings/facility/invite?facility_id=${facilityId}`}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
      >
        <UserPlus size={18} />
        <span>スタッフを招待する</span>
      </Link>
    </div>
  )
}








