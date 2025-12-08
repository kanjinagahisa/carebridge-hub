/**
 * 認証・権限関連のユーティリティ関数（サーバー側）
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'

/**
 * ユーザーのロールを取得（サーバー側）
 * @param userId - ユーザーID
 * @param facilityId - 施設ID（オプション、指定した場合はその施設でのロールを取得）
 * @returns ロール（'admin' | 'staff' | null）
 */
export async function getUserRole(
  userId: string,
  facilityId?: string
): Promise<'admin' | 'staff' | null> {
  const adminSupabase = createAdminClient()

  let query = adminSupabase
    .from('user_facility_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('deleted', false)

  if (facilityId) {
    query = query.eq('facility_id', facilityId)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) return null

  return data.role === ROLES.ADMIN || data.role === ROLES.STAFF ? data.role : null
}

/**
 * ユーザーがadminかどうかをチェック（サーバー側）
 * @param userId - ユーザーID
 * @param facilityId - 施設ID（オプション）
 * @returns adminかどうか
 */
export async function isAdmin(
  userId: string,
  facilityId?: string
): Promise<boolean> {
  const role = await getUserRole(userId, facilityId)
  return role === ROLES.ADMIN
}







