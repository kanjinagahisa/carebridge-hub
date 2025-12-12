/**
 * 利用者（Client）と利用者書類（ClientDocument）のAPI関数
 * 
 * 注意: 実際のスキーマとの対応
 * - `date_of_birth` (DATE) を使用（要求仕様の `birth_date` に対応）
 * - `memo` (TEXT) を使用（要求仕様の `support_memo` などに相当）
 * - その他のフィールド（`gender`, `address`, `guardian_name` など）は
 *   現在のスキーマには存在しないため、`updateClient` では使用できません
 */

import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { Client, ClientDocument } from '@/types/carebridge'

// ============================================================================
// ブラウザ用（Client-side）API関数
// ============================================================================

/**
 * 利用者IDで利用者情報を取得
 */
export async function fetchClientById(clientId: string): Promise<Client | null> {
  const supabase = createSupabaseClient()
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
 * 利用者の書類一覧を取得
 */
export async function fetchClientDocuments(
  clientId: string
): Promise<ClientDocument[]> {
  const supabase = createSupabaseClient()
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
 * 利用者情報の作成ペイロード型
 * 
 * 実際のスキーマに存在するフィールドのみを使用します：
 * - facility_id (必須) - ユーザーの所属施設ID
 * - name (必須)
 * - kana, date_of_birth, memo, photo_url (任意)
 */
export type CreateClientPayload = {
  facility_id: string
  name: string
  kana?: string | null
  date_of_birth?: string | null
  memo?: string | null
  photo_url?: string | null
}

/**
 * 利用者情報の更新ペイロード型
 * 
 * 注意: 実際のスキーマでは以下のフィールドのみが更新可能です：
 * - name, kana, date_of_birth, memo, photo_url
 * 
 * その他のフィールド（gender, address, guardian_name など）は
 * 現在のスキーマには存在しないため、更新できません。
 */
export type UpdateClientPayload = Partial<
  Pick<
    Client,
    | 'name'
    | 'kana'
    | 'date_of_birth'
    | 'memo'
    | 'photo_url'
  >
>

/**
 * 新しい利用者を作成
 * 
 * 実際のスキーマに存在するフィールドのみを使用します：
 * - facility_id (必須)
 * - name (必須)
 * - kana, date_of_birth, memo, photo_url (任意)
 * 
 * @param payload - 利用者情報
 * @returns 作成された利用者情報
 */
export async function createClient(
  payload: CreateClientPayload
): Promise<Client> {
  const supabase = createSupabaseClient()

  // 必須フィールドのバリデーション
  if (!payload.facility_id || !payload.name?.trim()) {
    throw new Error('施設IDと利用者名は必須です')
  }

  // 実際のスキーマに存在するフィールドのみを抽出
  const insertData: Record<string, any> = {
    facility_id: payload.facility_id,
    name: payload.name.trim(),
  }
  
  if (payload.kana !== undefined && payload.kana !== null) {
    insertData.kana = payload.kana.trim() || null
  }
  if (payload.date_of_birth !== undefined && payload.date_of_birth !== null) {
    insertData.date_of_birth = payload.date_of_birth.trim() || null
  }
  if (payload.memo !== undefined && payload.memo !== null) {
    insertData.memo = payload.memo.trim() || null
  }
  if (payload.photo_url !== undefined && payload.photo_url !== null) {
    insertData.photo_url = payload.photo_url.trim() || null
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('createClient error', error)
    throw error
  }

  return data as Client
}

/**
 * 利用者情報を更新
 * 
 * 実際のスキーマに存在するフィールドのみを更新します：
 * - name, kana, date_of_birth, memo, photo_url
 */
export async function updateClient(
  clientId: string,
  payload: UpdateClientPayload
): Promise<void> {
  const supabase = createSupabaseClient()

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

/**
 * 利用者書類をアップロード & 登録
 * 
 * @param clientId - 利用者ID
 * @param file - アップロードするファイル
 * @param options - オプション（type: 書類種別）
 * @returns 作成された書類情報
 */
export async function uploadClientDocument(
  clientId: string,
  file: File,
  options?: { type?: string }
): Promise<ClientDocument> {
  const supabase = createSupabaseClient()

  // ファイル拡張子を取得
  const ext = file.name.split('.').pop() ?? 'dat'
  const fileName = `${Date.now()}.${ext}`
  const path = `${clientId}/${fileName}`

  // 1) Storage にアップロード
  const { error: uploadError } = await supabase.storage
    .from('client-documents')
    .upload(path, file)

  if (uploadError) {
    console.error('uploadClientDocument uploadError', uploadError)
    throw uploadError
  }

  // 2) メタデータを client_documents に insert
  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      client_id: clientId,
      name: file.name,
      type: options?.type ?? null,
      path,
    })
    .select('*')
    .single()

  if (error) {
    console.error('uploadClientDocument insert error', error)
    // Storage にアップロード済みのファイルを削除（ロールバック）
    await supabase.storage.from('client-documents').remove([path])
    throw error
  }

  return data as ClientDocument
}

/**
 * 利用者書類を削除
 * 
 * Storage からファイルを削除し、データベースからもレコードを削除します。
 */
export async function deleteClientDocument(doc: ClientDocument): Promise<void> {
  const supabase = createSupabaseClient()

  // 1) Storage から削除
  const { error: storageError } = await supabase.storage
    .from('client-documents')
    .remove([doc.path])

  if (storageError) {
    console.error('deleteClientDocument storageError', storageError)
    // Storage が消せなくても DB 上の整合性は優先してよいが、
    // v1ではエラーとして扱う
    throw storageError
  }

  // 2) テーブルから削除（物理削除）
  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', doc.id)

  if (error) {
    console.error('deleteClientDocument delete error', error)
    throw error
  }
}

/**
 * 利用者書類のダウンロードURLを取得
 * 
 * @param doc - 書類情報
 * @returns ダウンロードURL（有効期限付き）
 */
export async function getClientDocumentUrl(doc: ClientDocument): Promise<string> {
  const supabase = createSupabaseClient()
  const { data } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(doc.path, 3600) // 1時間有効

  if (!data) {
    throw new Error('Failed to create signed URL')
  }

  return data.signedUrl
}












