# RLSエラー修正レポート

## ステップ1：原因の特定

### 1-1. facilitiesテーブルとRLSポリシーの洗い出し

#### テーブル定義
- **ファイル**: `supabase/migrations/001_initial_schema.sql`
- **カラム**: `id`, `name`, `type`, `address`, `phone`, `created_at`, `updated_at`, `deleted`
- **重要**: `owner_id`や`created_by`のようなユーザーIDカラムは**存在しない**

#### 現在のRLSポリシー一覧

| ポリシー名 | 対象コマンド | USING条件 | WITH CHECK条件 | ファイル | 状態 |
|-----------|------------|----------|---------------|---------|------|
| "Users can view facilities they belong to" | FOR SELECT | `id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid())) AND deleted = FALSE` | - | `002_rls_policies.sql` | 有効 |
| "Authenticated users can create facilities" | FOR INSERT | - | `auth.uid() IS NOT NULL` | `008_fix_policy_roles.sql` | **問題あり** |

**現在のINSERTポリシー（`008_fix_policy_roles.sql`）：**
```sql
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**問題点：**
- `TO authenticated`が**ない**
- これにより、`anon`ロールからのリクエストでもポリシーが評価される
- Supabaseの`createBrowserClient`は`anon`キーを使用するため、リクエストは`anon`ロールで送信される
- 認証トークンが正しく含まれていても、`TO authenticated`がないため、PostgRESTが認証コンテキストを正しく評価できない可能性がある

### 1-2. `/app/setup/create/page.tsx`のINSERT仕様確認

#### Supabaseクライアントの取得方法
```typescript
const supabase = createClient()  // lib/supabase/client.tsから
const supabaseForInsert = createClient()  // INSERT用の新しいインスタンス
```

#### セッション管理
- `auth.getSession()`と`auth.getUser()`を複数回呼び出し
- `auth.setSession()`で明示的にセッションを設定
- セッションとユーザーの存在を確認してからINSERTを実行

#### facilitiesへのINSERT payload
```typescript
.insert({
  name: facilityName.trim(),
  type: 'other',
})
```
- `owner_id`や`created_by`は**渡していない**（テーブルに存在しないため）

### 1-3. 根本原因

**なぜ`auth.uid() IS NOT NULL`のポリシーがあるのにRLSエラーが起きているのか：**

**原因：`TO authenticated`がないため、ポリシーが`anon`ロールでも評価されるが、PostgRESTが認証コンテキストを正しく評価できていない**

Supabaseの`createBrowserClient`は`anon`キーを使用するため、リクエストは`anon`ロールで送信されます。認証トークンが正しく含まれていても、`TO authenticated`がないポリシーは`anon`ロールでも評価されますが、PostgRESTが認証コンテキストを正しく評価できない場合、`auth.uid()`が`NULL`になり、`WITH CHECK (auth.uid() IS NOT NULL)`が失敗します。

## ステップ2：修正方針

**パターン2を採用：RLSポリシーに`TO authenticated`を追加**

理由：
- `createBrowserClient`は正しく実装されており、認証トークンは自動的にリクエストヘッダーに含まれる
- 問題はRLSポリシーの評価方法にある
- `TO authenticated`を追加することで、認証されたユーザーのみがポリシーを通過できるようになる
- SupabaseのPostgRESTは、認証トークンが正しく含まれている場合、自動的に`authenticated`ロールとしてリクエストを処理する

## ステップ3：修正内容

### 3-1. 新しいマイグレーションファイル

**ファイル**: `supabase/migrations/011_fix_facility_insert_policy_final.sql`

```sql
-- Fix facilities INSERT policy to work correctly with authenticated users
-- The issue is that without TO authenticated, the policy is evaluated for anon role
-- which may not have the auth context properly set

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create facilities" ON facilities;

-- Recreate the policy with TO authenticated
-- This ensures the policy only applies to authenticated role requests
-- Supabase client with auth token will automatically use authenticated role
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

### 3-2. TypeScriptコードの変更

**変更不要** - `app/setup/create/page.tsx`は既に正しく実装されています。

## ステップ4：動作確認手順

1. **Supabaseダッシュボードでマイグレーションを実行**
   - SQL Editorを開く
   - `supabase/migrations/011_fix_facility_insert_policy_final.sql`の内容をコピー
   - SQL Editorに貼り付けて実行

2. **開発サーバーの再起動（必要なら）**
   ```bash
   npm run dev
   ```

3. **ブラウザで施設作成画面を開く**
   - `http://localhost:3000/setup/create`にアクセス
   - ページをリロード（⌘+R または F5）

4. **施設を作成**
   - 施設名に「永富デイサービス」などを入力
   - 「施設を作成する」ボタンをクリック

5. **期待する挙動**
   - ✅ エラーメッセージが表示されない
   - ✅ `/home`に自動リダイレクトされる
   - ✅ ブラウザのコンソールにエラーが表示されない

6. **Supabaseダッシュボードで確認**
   - Table Editor → `facilities`テーブルを開く
   - 新しい行が作成されていることを確認
   - Table Editor → `user_facility_roles`テーブルを開く
   - `(user_id, facility_id, role='admin')`が追加されていることを確認

7. **もしまだエラーが出る場合**
   - ブラウザのコンソール（F12 → Consoleタブ）でエラーメッセージを確認
   - Networkタブで`/rest/v1/facilities`へのリクエストを確認
     - Request Headersに`Authorization: Bearer <token>`が含まれているか確認
   - SupabaseダッシュボードのSQL Editorで以下を実行してポリシーを確認：
     ```sql
     SELECT policyname, cmd, roles, with_check
     FROM pg_policies
     WHERE tablename = 'facilities' AND cmd = 'INSERT';
     ```
   - 結果を共有してください












