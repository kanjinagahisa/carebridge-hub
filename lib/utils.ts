import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .eq('deleted', false)
    .single()

  return profile ? { ...user, ...profile } : null
}

export async function getUserFacilities(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_facility_roles')
    .select('facility_id, role, facilities(*)')
    .eq('user_id', userId)
    .eq('deleted', false)

  return data || []
}


