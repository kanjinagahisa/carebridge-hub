/**
 * 認証・権限関連のユーティリティ関数
 */

import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/constants'

/**
 * 現在のユーザーのロールを取得（クライアント側）
 * @param facilityId - 施設ID（オプション、指定した場合はその施設でのロールを取得）
 * @returns ロール（'admin' | 'staff' | null）
 */
export async function getCurrentUserRole(
  facilityId?: string
): Promise<'admin' | 'staff' | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let query = supabase
    .from('user_facility_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('deleted', false)

  if (facilityId) {
    query = query.eq('facility_id', facilityId)
  }

  const { data, error } = await query.maybeSingle()

  if (error || !data) return null

  return data.role === ROLES.ADMIN || data.role === ROLES.STAFF ? data.role : null
}

/**
 * ユーザーが編集権限を持っているかチェック
 * @param facilityId - 施設ID
 * @returns 編集可能かどうか
 */
export async function canEditClient(facilityId?: string): Promise<boolean> {
  const role = await getCurrentUserRole(facilityId)
  return role === ROLES.ADMIN || role === ROLES.STAFF
}









