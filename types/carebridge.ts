/**
 * CareBridge Hub の型定義
 * 
 * 注意: 実際のデータベーススキーマとの差分
 * - 要求仕様では `birth_date`, `gender`, `address`, `guardian_name`, `guardian_contact`,
 *   `medical_history`, `allergies`, `medications`, `precautions`, `support_memo` などが
 *   想定されていましたが、実際のスキーマには以下のフィールドのみが存在します：
 *   - `date_of_birth` (DATE) - 要求仕様の `birth_date` に対応
 *   - `memo` (TEXT) - 要求仕様の `support_memo` などに相当する可能性がある
 * 
 * 将来的にスキーマが拡張される可能性を考慮し、型定義では要求仕様に近い形で
 * 定義していますが、実際のAPI関数では実スキーマに合わせて調整しています。
 */

/**
 * 利用者（Client）の型定義
 * 
 * 実際のスキーマ (clients テーブル):
 * - id: UUID
 * - facility_id: UUID (NOT NULL)
 * - name: TEXT (NOT NULL)
 * - kana: TEXT (nullable)
 * - date_of_birth: DATE (nullable) - 要求仕様の `birth_date` に対応
 * - memo: TEXT (nullable) - 要求仕様の `support_memo` などに相当
 * - photo_url: TEXT (nullable)
 * - created_at: TIMESTAMPTZ
 * - updated_at: TIMESTAMPTZ
 * - deleted: BOOLEAN
 */
export type Client = {
  id: string
  facility_id: string
  name: string
  kana?: string | null
  date_of_birth?: string | null // ISO date string (YYYY-MM-DD)
  memo?: string | null // 要求仕様の `support_memo` などに相当
  photo_url?: string | null
  created_at: string
  updated_at?: string | null
  deleted?: boolean

  // 以下のフィールドは現在のスキーマには存在しませんが、
  // 将来的な拡張を考慮して型定義に含めています
  // 実際のAPI関数では使用されません
  gender?: string | null
  address?: string | null
  guardian_name?: string | null
  guardian_contact?: string | null
  medical_history?: string | null
  allergies?: string | null
  medications?: string | null
  precautions?: string | null
  support_memo?: string | null
}

/**
 * 利用者書類（ClientDocument）の型定義
 * 
 * 実際のスキーマ (client_documents テーブル):
 * - id: UUID
 * - client_id: UUID (NOT NULL)
 * - name: TEXT (NOT NULL)
 * - type: TEXT (nullable) - 種別（計画書 / 報告書 / その他 など）
 * - path: TEXT (NOT NULL) - Storage 上のパス
 * - created_at: TIMESTAMPTZ
 * - updated_at: TIMESTAMPTZ
 * - deleted: BOOLEAN
 */
export type ClientDocument = {
  id: string
  client_id: string
  name: string
  type?: string | null
  path: string
  created_at: string
  updated_at?: string | null
  deleted?: boolean
}

/**
 * グループ（Group）の型定義
 * 
 * 実際のスキーマ (groups テーブル):
 * - id: UUID
 * - facility_id: UUID (NOT NULL)
 * - type: TEXT (NOT NULL)
 * - name: TEXT (NOT NULL)
 * - client_id: UUID (nullable)
 * - description: TEXT (nullable) - プロンプトでは `memo` と記載されているが、実際のスキーマは `description`
 * - created_by: UUID (NOT NULL)
 * - created_at: TIMESTAMPTZ
 * - updated_at: TIMESTAMPTZ
 * - deleted: BOOLEAN
 */
export type Group = {
  id: string
  facility_id: string
  type: string
  name: string
  client_id?: string | null
  description?: string | null // プロンプトでは `memo` と記載されているが、実際のスキーマは `description`
  created_by: string
  created_at: string
  updated_at?: string | null
  deleted?: boolean
}

/**
 * 投稿（Post）の型定義
 * 
 * 実際のスキーマ (posts テーブル):
 * - id: UUID
 * - group_id: UUID (nullable) - グループ投稿の場合
 * - client_id: UUID (nullable) - 利用者投稿の場合
 * - author_id: UUID (NOT NULL)
 * - side: TEXT (NOT NULL) - 'care' or 'client' (グループ投稿の場合のみ使用)
 * - body: TEXT (NOT NULL) - プロンプトでは `content` と記載されているが、実際のスキーマは `body`
 * - created_at: TIMESTAMPTZ
 * - updated_at: TIMESTAMPTZ
 * - deleted: BOOLEAN
 * 
 * 注意: group_id と client_id のどちらか一方のみが設定される（両方nullまたは両方設定は不可）
 * 注意: 画像は `attachments` テーブルで管理される（プロンプトでは `image_url` と記載されているが、実際は別テーブル）
 */
export type Post = {
  id: string
  group_id?: string | null // グループ投稿の場合
  client_id?: string | null // 利用者投稿の場合
  author_id: string
  side: string // グループ投稿の場合のみ使用（'care' or 'client'）
  body: string // プロンプトでは `content` と記載されているが、実際のスキーマは `body`
  created_at: string
  updated_at?: string | null
  deleted?: boolean
  // リレーション（JOIN で取得）
  author?: {
    display_name: string
    profession?: string
  }
  reactions?: PostReaction[]
  reads?: PostRead[]
  attachments?: Attachment[]
}

/**
 * 投稿リアクション（PostReaction）の型定義
 * 
 * 実際のスキーマ (post_reactions テーブル):
 * - id: UUID
 * - post_id: UUID (NOT NULL)
 * - user_id: UUID (NOT NULL)
 * - type: TEXT (NOT NULL) - 'like' など
 * - created_at: TIMESTAMPTZ
 */
export type PostReaction = {
  id: string
  post_id: string
  user_id: string
  type: string
  created_at: string
}

/**
 * 投稿既読（PostRead）の型定義
 * 
 * 実際のスキーマ (post_reads テーブル):
 * - id: UUID
 * - post_id: UUID (NOT NULL)
 * - user_id: UUID (NOT NULL)
 * - read_at: TIMESTAMPTZ
 */
export type PostRead = {
  id: string
  post_id: string
  user_id: string
  read_at: string
}

/**
 * 添付ファイル（Attachment）の型定義
 * 
 * 実際のスキーマ (attachments テーブル):
 * - id: UUID
 * - post_id: UUID (NOT NULL)
 * - facility_id: UUID (NOT NULL)
 * - client_id: UUID (nullable)
 * - file_url: TEXT (NOT NULL)
 * - file_name: TEXT (NOT NULL)
 * - file_type: TEXT (NOT NULL)
 * - created_at: TIMESTAMPTZ
 * - deleted: BOOLEAN
 */
export type Attachment = {
  id: string
  post_id: string
  facility_id: string
  client_id?: string | null
  file_url: string
  file_name: string
  file_type: string
  created_at: string
  deleted?: boolean
}

