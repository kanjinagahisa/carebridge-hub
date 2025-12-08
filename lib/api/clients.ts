/**
 * 利用者（Client）と利用者書類（ClientDocument）のAPI関数
 * 
 * 注意: 実際のスキーマとの対応
 * - `date_of_birth` (DATE) を使用（要求仕様の `birth_date` に対応）
 * - `memo` (TEXT) を使用（要求仕様の `support_memo` などに相当）
 * - その他のフィールド（`gender`, `address`, `guardian_name` など）は
 *   現在のスキーマには存在しないため、`updateClient` では使用できません
 */

import { createClient } from '@/lib/supabase/client'
import type { Client, ClientDocument } from '@/types/carebridge'

// ============================================================================
// ブラウザ用（Client-side）API関数
// ============================================================================

/**
 * 利用者IDで利用者情報を取得
 */
export async function fetchClientById(clientId: string): Promise<Client | null> {
  const supabase = createClient()
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
  const supabase = createClient()
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
 * 利用者情報を更新
 * 
 * 実際のスキーマに存在するフィールドのみを更新します：
 * - name, kana, date_of_birth, memo, photo_url
 */
export async function updateClient(
  clientId: string,
  payload: UpdateClientPayload
): Promise<void> {
  const supabase = createClient()

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
  const supabase = createClient()

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
  const supabase = createClient()

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
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('client-documents')
    .createSignedUrl(doc.path, 3600) // 1時間有効

  if (!data) {
    throw new Error('Failed to create signed URL')
  }

  return data.signedUrl
}








