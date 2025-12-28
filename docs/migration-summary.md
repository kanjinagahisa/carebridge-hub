# Migration ファイル要約

このドキュメントは、`supabase/migrations/` フォルダ内の migration ファイルの要約です。
実際の DB スキーマとの整合性チェックに使用してください。

## 主要 Migration の分類

### 1. 初期スキーマ作成（001-003）

| Migration | ファイル名 | 主な内容 |
|-----------|-----------|---------|
| 001 | `001_initial_schema.sql` | 基本テーブル作成（facilities, users, clients, groups, posts など） |
| 002 | `002_rls_policies.sql` | RLS ポリシーの初期設定 |
| 003 | `003_invite_codes.sql` | 招待コードテーブルの作成 |

**001_initial_schema.sql で作成されるテーブル：**
- `facilities` - 施設
- `users` - ユーザー（auth.users を拡張）
- `user_facility_roles` - ユーザー施設役割
- `clients` - 利用者
- `groups` - グループ
- `group_members` - グループメンバー
- `posts` - 投稿（初期状態では `group_id` は NOT NULL、`client_id` は存在しない）
- `post_reactions` - 投稿リアクション
- `post_reads` - 投稿既読
- `attachments` - 添付ファイル

### 2. RLS ポリシー修正（004-025）

| Migration | ファイル名 | 主な内容 |
|-----------|-----------|---------|
| 004-025 | 各種 | `facilities` テーブルの INSERT ポリシー修正、権限付与など |

**注意**: これらの migration は主に RLS ポリシーの調整です。スキーマ構造には影響しません。

### 3. スキーマ拡張（026-041）

| Migration | ファイル名 | 主な内容 |
|-----------|-----------|---------|
| 026 | `026_create_client_documents.sql` | `client_documents` テーブルの作成 |
| 027 | `027_client_documents_rls_policies.sql` | `client_documents` の RLS ポリシー |
| 028 | `028_extend_invite_codes.sql` | `invite_codes` テーブルの拡張 |
| 036 | `036_add_client_id_to_posts.sql` | `posts` テーブルに `client_id` カラムを追加、`group_id` を nullable に |
| 037-040 | 各種 | `posts`, `post_reactions`, `post_reads`, `attachments` の RLS ポリシー更新（client_id 対応） |
| 041 | `041_create_attachments_storage_bucket.sql` | Storage バケット `attachments` のポリシー設定 |

**重要な変更：**

#### Migration 026: client_documents テーブル
```sql
CREATE TABLE client_documents (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  type TEXT,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted BOOLEAN
);
```

#### Migration 036: posts テーブルの変更
```sql
-- group_id を nullable に
ALTER TABLE posts ALTER COLUMN group_id DROP NOT NULL;

-- client_id カラムを追加
ALTER TABLE posts ADD COLUMN client_id UUID REFERENCES clients(id);

-- 制約: group_id と client_id のどちらか一方のみ設定
ALTER TABLE posts ADD CONSTRAINT posts_group_or_client_check
  CHECK (
    (group_id IS NOT NULL AND client_id IS NULL) OR
    (group_id IS NULL AND client_id IS NOT NULL)
  );
```

### 4. データ修正（049-052）

| Migration | ファイル名 | 主な内容 |
|-----------|-----------|---------|
| 049 | `049_fix_clients_facility_id.sql` | 特定の `clients.facility_id` の修正（データ修正） |
| 050-052 | 各種 | `clients.facility_id` 関連の診断・修正 |

**注意**: これらの migration はデータ修正のため、スキーマ構造には影響しませんが、既存データに影響します。

### 5. RLS ポリシー調整（053-065）

| Migration | ファイル名 | 主な内容 |
|-----------|-----------|---------|
| 053-065 | 各種 | RLS ポリシーの調整、Storage アクセスの修正など |

## スキーマの変遷まとめ

### 初期状態（Migration 001 後）

```
facilities
users
user_facility_roles
clients
groups
group_members
posts (group_id: NOT NULL, client_id: なし)
post_reactions
post_reads
attachments
invite_codes (Migration 003 で追加)
```

### 現在の想定状態（Migration 065 後）

```
facilities
users
user_facility_roles
clients
client_documents (Migration 026 で追加)
groups
group_members
posts (group_id: nullable, client_id: 追加)
post_reactions
post_reads
attachments
invite_codes
```

## 確認すべきポイント

### 1. posts テーブル
- [ ] `client_id` カラムが存在するか（Migration 036）
- [ ] `group_id` が nullable か（Migration 036）
- [ ] `posts_group_or_client_check` 制約が存在するか（Migration 036）

### 2. client_documents テーブル
- [ ] テーブルが存在するか（Migration 026）
- [ ] RLS ポリシーが設定されているか（Migration 027）

### 3. Storage バケット
- [ ] `attachments` バケットが存在するか（Migration 041、手動作成が必要）
- [ ] Storage ポリシーが設定されているか（Migration 041）

### 4. invite_codes テーブル
- [ ] テーブルが存在するか（Migration 003）
- [ ] 拡張されたカラムが存在するか（Migration 028）

## 型定義との対応

`types/carebridge.ts` で定義されている型と、実際のスキーマの対応：

| 型 | テーブル | 主要カラム | 備考 |
|---|---------|-----------|------|
| `Client` | `clients` | id, facility_id, name, kana, date_of_birth, memo, photo_url | 型定義には将来拡張用のフィールドも含まれる |
| `ClientDocument` | `client_documents` | id, client_id, name, type, path | Migration 026 で作成 |
| `Group` | `groups` | id, facility_id, type, name, client_id, description | |
| `Post` | `posts` | id, group_id, client_id, author_id, side, body | Migration 036 で client_id 追加 |
| `PostReaction` | `post_reactions` | id, post_id, user_id, type | |
| `PostRead` | `post_reads` | id, post_id, user_id, read_at | |
| `Attachment` | `attachments` | id, post_id, facility_id, client_id, file_url, file_name, file_type | |

## 次のステップ

1. 各 Supabase プロジェクトで、上記の「確認すべきポイント」をチェック
2. 差分を `PRODUCTION_LOCAL_DIAGNOSIS_GUIDE.md` に記録
3. 整合性を取る方向性を決定（migrations に寄せる / 実 DB に寄せる）







