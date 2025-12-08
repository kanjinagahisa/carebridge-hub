/**
 * 利用者（Client）と利用者書類（ClientDocument）のAPI関数（サーバーサイド用）
 * 
 * Server Components や API Routes で使用する場合の関数群
 * 
 * 注意: 実際のスキーマとの対応は lib/api/clients.ts と同じです
 */

import { createClient } from '@/lib/supabase/server'
import type { Client, ClientDocument } from '@/types/carebridge'
import type { UpdateClientPayload } from './clients'

/**
 * 利用者IDで利用者情報を取得（サーバーサイド）
 */
export async function fetchClientById(clientId: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) {
    console.error('fetchClientById error', error)
    throw error
  }

  return data as Client | null
}

/**
 * 利用者の書類一覧を取得（サーバーサイド）
 */
export async function fetchClientDocuments(
  clientId: string
): Promise<ClientDocument[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_documents')
    .select('*')
    .eq('client_id', clientId)
    .eq('deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchClientDocuments error', error)
    throw error
  }

  return (data ?? []) as ClientDocument[]
}

/**
 * 利用者情報を更新（サーバーサイド）
 */
export async function updateClient(
  clientId: string,
  payload: UpdateClientPayload
): Promise<void> {
  const supabase = await createClient()

  // 実際のスキーマに存在するフィールドのみを抽出
  const updateData: Record<string, any> = {}
  if (payload.name !== undefined) updateData.name = payload.name
  if (payload.kana !== undefined) updateData.kana = payload.kana
  if (payload.date_of_birth !== undefined) updateData.date_of_birth = payload.date_of_birth
  if (payload.memo !== undefined) updateData.memo = payload.memo
  if (payload.photo_url !== undefined) updateData.photo_url = payload.photo_url

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', clientId)

  if (error) {
    console.error('updateClient error', error)
    throw error
  }
}








