# 🗄️ DB / RLS 作業の申し送り

## 📋 実施済み作業・確認事項

### バックアップ・安全確認

- ✅ `pg_restore --list <backup> | head` を実行し、バックアップが破損しておらず復元可能な形式で存在することを確認済み
- ✅ Supabase SQL Editor にて `storage.objects` の件数確認を行い、Storage データが正常に存在していることを確認済み

### RLS / 権限設計（posts）

- ✅ `user_facility_roles` を正として role 管理
- ✅ `is_facility_admin(facility_id)` 関数を作成
- ✅ `posts` の UPDATE policy を「投稿者 OR facility admin」の条件に変更済み
- ✅ DELETE は使わず soft delete（`deleted` / `deleted_at`）方針で確定

### soft delete 運用

- ✅ `posts` に `deleted_at` カラムを追加済み
- ✅ SELECT policy は `deleted=false` のみを表示
- ✅ UPDATE により `deleted=true`, `deleted_at=now()` を設定

### 物理削除（定期）

- ✅ `pg_cron` を有効化
- ✅ `cron.schedule` により `deleted=true` かつ `deleted_at < now() - interval '90 days'` の `posts` を毎日 3:00 に DELETE するジョブを登録済み
- ✅ `cron.job` にて `active=true` を確認済み

### 検証

- ✅ admin / staff impersonate による RLS 挙動確認済み
- ✅ admin は施設内全投稿更新可
- ✅ staff は自分の投稿のみ更新可

---

## 🔜 次の作業候補

### 1. notifications / states の RLS 設計・確認

**現状：**
- `notifications` テーブルと `states` テーブルは現在のスキーマには存在しない
- 将来的に実装される可能性があるテーブル

**作業内容：**
- テーブルが作成された際に、適切な RLS ポリシーを設計・実装
- `user_facility_roles` ベースの権限管理を適用
- `deleted` / `deleted_at` による soft delete パターンの検討

**参考パターン：**
- `posts` テーブルと同様の権限設計を適用
- `is_facility_admin()` 関数を活用
- 施設単位でのアクセス制御

### 2. trigger の整理

**現状：**
- `update_updated_at_column()` 関数が定義済み（`001_initial_schema.sql`）
- 以下のテーブルに `updated_at` トリガーが設定済み：
  - `facilities` → `update_facilities_updated_at`
  - `users` → `update_users_updated_at`
  - `user_facility_roles` → `update_user_facility_roles_updated_at`
  - `clients` → `update_clients_updated_at`
  - `groups` → `update_groups_updated_at`
  - `posts` → `update_posts_updated_at`
  - `client_documents` → `update_client_documents_updated_at`（`026_create_client_documents.sql`）

**確認事項：**
- トリガーの一貫性確認（すべて `update_updated_at_column()` を使用）
- 不要なトリガーの有無
- パフォーマンスへの影響
- トリガー関数の最適化
- `updated_at` カラムを持つがトリガーが設定されていないテーブルの有無

**作業内容：**
- 全トリガーの一覧化とドキュメント化（✅ 上記に記載済み）
- 各トリガーの目的と動作確認
- 必要に応じて整理・最適化
- マイグレーションファイルでのトリガー定義の一貫性確認

---

## 📝 参考情報

### posts テーブルの RLS 設計パターン

```sql
-- UPDATE policy: 投稿者 OR facility admin
CREATE POLICY "Users can update their own posts or facility admin can update any post"
  ON posts FOR UPDATE
  USING (
    author_id = auth.uid() 
    OR is_facility_admin(
      (SELECT facility_id FROM groups WHERE id = posts.group_id)
    )
  );
```

### soft delete パターン

```sql
-- SELECT policy: deleted=false のみ表示
CREATE POLICY "Users can view non-deleted posts"
  ON posts FOR SELECT
  USING (
    deleted = FALSE
    AND group_id IN (
      SELECT id FROM groups
      WHERE facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
        AND deleted = FALSE
    )
  );

-- Soft delete: UPDATE で deleted=true, deleted_at=now() を設定
UPDATE posts 
SET deleted = TRUE, deleted_at = NOW() 
WHERE id = <post_id>;
```

### pg_cron による定期物理削除

```sql
-- 90日経過した soft deleted レコードを物理削除
SELECT cron.schedule(
  'delete-old-posts',
  '0 3 * * *',  -- 毎日 3:00
  $$
  DELETE FROM posts
  WHERE deleted = TRUE
    AND deleted_at < NOW() - INTERVAL '90 days';
  $$
);

-- ジョブの確認
SELECT * FROM cron.job WHERE jobname = 'delete-old-posts';
```

### 現在のトリガー一覧

**トリガー関数：**
- `update_updated_at_column()` - `updated_at` カラムを自動更新

**設定済みトリガー：**
| テーブル | トリガー名 | タイミング | 関数 | マイグレーション |
|---------|-----------|-----------|------|----------------|
| `facilities` | `update_facilities_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `users` | `update_users_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `user_facility_roles` | `update_user_facility_roles_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `clients` | `update_clients_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `groups` | `update_groups_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `posts` | `update_posts_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `001_initial_schema.sql` |
| `client_documents` | `update_client_documents_updated_at` | BEFORE UPDATE | `update_updated_at_column()` | `026_create_client_documents.sql` |

**その他の関数（RLS関連）：**
- `get_user_facility_ids(user_uuid UUID)` - ユーザーの施設ID一覧を取得（`002_rls_policies.sql`）
- `is_facility_admin(facility_id)` - 施設管理者かどうかを判定（申し送り情報より）

---

## 🔗 関連ドキュメント

- [本番DBバックアップガイド](./production-db-backup-guide.md)
- [クリーンアップ結果確認ガイド](./verify-cleanup-result-guide.md)

---

**最終更新日：** 2025年1月（推定）
**作成者：** DB/RLS 作業チーム

