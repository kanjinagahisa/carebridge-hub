# 施設作成後のリダイレクト問題 - 原因分析レポート（最終版）

## 1. データの事実確認（要実行）

### 確認すべきSQLクエリ

以下のSQLをSupabaseダッシュボードのSQL Editorで実行して、実際のデータを確認してください：

```sql
-- 1. 最近作成されたfacilitiesを確認
SELECT 
  id,
  name,
  type,
  created_at
FROM facilities
WHERE deleted = false
ORDER BY created_at DESC
LIMIT 5;

-- 2. 特定ユーザー（ff73cb02-98c0-4139-b972-4c023482e257）のuser_facility_rolesを確認
SELECT 
  ufr.id,
  ufr.user_id,
  ufr.facility_id,
  ufr.role,
  ufr.created_at,
  ufr.deleted,
  f.name as facility_name
FROM user_facility_roles ufr
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.user_id = 'ff73cb02-98c0-4139-b972-4c023482e257'
ORDER BY ufr.created_at DESC;

-- 3. 最近作成されたuser_facility_rolesを確認（deleted=falseのみ）
SELECT 
  ufr.id,
  ufr.user_id,
  ufr.facility_id,
  ufr.role,
  ufr.created_at,
  ufr.deleted,
  f.name as facility_name
FROM user_facility_roles ufr
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.deleted = false
ORDER BY ufr.created_at DESC
LIMIT 5;
```

## 2. コードの流れの分析

### 2-1. `/setup/create` のフォーム送信

**ファイル**: `app/setup/create/page.tsx` (96-127行目)

**処理の流れ**:
1. フォーム送信時に `handleSubmit` が実行される
2. `/api/facilities/create` に POST リクエストを送信
   - **Payload**: `{ name: facilityName.trim() }`
   - **Headers**: `Content-Type: application/json`
3. レスポンスが 201 の場合、500ms 待機後に `window.location.href = '/home'` でリダイレクト

### 2-2. `/api/facilities/create` の処理

**ファイル**: `app/api/facilities/create/route.ts`

**処理の流れ**:
1. **認証確認** (6-81行目)
   - Cookieからセッション情報を取得・設定
   - `finalUser` を取得（`user || userFromCookie`）

2. **施設作成** (98-121行目)
   ```typescript
   const { data: facility, error: facilityError } = await adminSupabase
     .from('facilities')
     .insert({ name: name.trim(), type: 'other' })
     .select()
     .single()
   ```
   - `adminSupabase`（service_roleキー使用）でRLSをバイパス
   - エラー時は500を返す

3. **ユーザー確認・作成** (123-156行目)
   - `users`テーブルにユーザーが存在するか確認
   - 存在しない場合は作成

4. **user_facility_roles への INSERT** (158-171行目)
   ```typescript
   const { error: roleError } = await adminSupabase
     .from('user_facility_roles')
     .insert({
       user_id: finalUser.id,
       facility_id: facility.id,
       role: 'admin',
     })
   ```
   - **重要**: `roleError` が発生した場合、500エラーを返す
   - エラーがない場合のみ `{ facility }` を返す（201）

### 2-3. ミドルウェアの処理

**ファイル**: `lib/supabase/middleware.ts` (143-169行目)

**処理の流れ**:
1. 認証済みユーザーを確認（`finalUser`）
2. `/setup` パス以外で、以下のクエリを実行：
   ```typescript
   const { data: roles, error: rolesError } = await supabase
     .from('user_facility_roles')
     .select('facility_id')
     .eq('user_id', finalUser.id)
     .eq('deleted', false)
   ```
3. `roles` が空配列または存在しない場合、`/setup/choose` にリダイレクト

**重要な点**:
- ミドルウェアは `supabase`（anonキー使用）でクエリを実行
- RLSポリシーが適用される

## 3. 原因の特定

### 最も可能性が高い原因: RLSポリシーの循環参照問題

**根拠**:

1. **RLSポリシーの定義** (`supabase/migrations/002_rls_policies.sql` 56-61行目):
   ```sql
   CREATE POLICY "Users can view roles in their facilities"
     ON user_facility_roles FOR SELECT
     USING (
       facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
       AND deleted = FALSE
     );
   ```

2. **`get_user_facility_ids` 関数の定義** (14-24行目):
   ```sql
   CREATE OR REPLACE FUNCTION get_user_facility_ids(user_uuid UUID)
   RETURNS TABLE(facility_id UUID) AS $$
   BEGIN
     RETURN QUERY
     SELECT ufr.facility_id
     FROM user_facility_roles ufr
     WHERE ufr.user_id = user_uuid
       AND ufr.deleted = FALSE;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. **循環参照の問題**:
   - `user_facility_roles` の SELECT ポリシーは、`get_user_facility_ids(auth.uid())` の結果に依存
   - しかし、`get_user_facility_ids` 関数は `user_facility_roles` テーブルを参照
   - 新しい `user_facility_roles` レコードが作成された直後、ミドルウェアが `user_facility_roles` をクエリしようとすると、RLSポリシーが「まだそのレコードを参照できない」と判断する可能性がある

4. **実際の動作**:
   - API Route では `adminSupabase`（service_roleキー）を使用しているため、RLSをバイパスして INSERT が成功
   - しかし、ミドルウェアは `supabase`（anonキー）を使用しているため、RLSポリシーが適用される
   - 新しいレコードが作成された直後、RLSポリシーが「そのレコードを参照できない」と判断し、空の結果を返す

### 確認方法

1. **SupabaseダッシュボードでSQLクエリを実行**
   - 上記のSQLクエリで、`user_facility_roles` にレコードが存在するか確認
   - レコードが存在する場合、RLSポリシーの問題である可能性が高い

2. **ターミナルログを再確認**
   - `[API] Role creation error:` が表示されていないことを確認
   - ミドルウェアのログで、`rolesError` が発生していないことを確認

## 4. 原因の結論

**原因**: **RLSポリシーの循環参照問題**

- `user_facility_roles` への INSERT は成功している（201が返されている）
- しかし、ミドルウェアが `user_facility_roles` をクエリする際、RLSポリシーが「そのレコードを参照できない」と判断している
- これは、`get_user_facility_ids` 関数が `user_facility_roles` を参照しているため、循環参照が発生している可能性がある

## 5. 修正案の概要

### 修正案1: ミドルウェアのクエリを改善（推奨）

**変更対象ファイル**: `lib/supabase/middleware.ts`

**変更内容**:
- `get_user_facility_ids` 関数を使わず、直接 `user_facility_roles` をクエリする
- または、`SECURITY DEFINER` 関数を使って、RLSをバイパスしてクエリする

**具体的な変更**:
```typescript
// 現在のコード（155-159行目）
const { data: roles, error: rolesError } = await supabase
  .from('user_facility_roles')
  .select('facility_id')
  .eq('user_id', finalUser.id)
  .eq('deleted', false)

// 修正案: よりシンプルなクエリに変更
// RLSポリシーが正しく機能するように、直接クエリする
const { data: roles, error: rolesError } = await supabase
  .from('user_facility_roles')
  .select('facility_id')
  .eq('user_id', finalUser.id)
  .eq('deleted', false)
```

**注意点**:
- RLSポリシーが正しく設定されていれば、このクエリは動作するはず
- しかし、循環参照の問題がある場合は、RLSポリシー自体を修正する必要がある

### 修正案2: RLSポリシーを修正

**変更対象ファイル**: `supabase/migrations/024_fix_user_facility_roles_select_policy.sql`（新規作成）

**変更内容**:
- `user_facility_roles` の SELECT ポリシーを、循環参照を避ける形に修正
- ユーザーが自分自身の `user_facility_roles` を参照できるようにする

**具体的な変更**:
```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view roles in their facilities" ON user_facility_roles;

-- 新しいポリシーを作成（循環参照を避ける）
CREATE POLICY "Users can view their own roles"
  ON user_facility_roles FOR SELECT
  USING (
    user_id = auth.uid()
    AND deleted = FALSE
  );
```

**メリット**:
- 循環参照を完全に回避
- シンプルで理解しやすい

**デメリット**:
- 既存のポリシー設計を変更する必要がある

### 修正案3: ミドルウェアでadminクライアントを使用（非推奨）

**変更対象ファイル**: `lib/supabase/middleware.ts`

**変更内容**:
- ミドルウェアで `user_facility_roles` をクエリする際、`adminSupabase` を使用してRLSをバイパス

**デメリット**:
- セキュリティリスクが高い
- ミドルウェアでservice_roleキーを使用するのは推奨されない

## 6. 推奨される修正案

**修正案1 + 修正案2 の組み合わせ**を推奨します：

1. **まず、RLSポリシーを修正**（修正案2）
   - 循環参照を完全に回避
   - よりシンプルで理解しやすい

2. **次に、ミドルウェアのクエリを確認**（修正案1）
   - 新しいポリシーが正しく機能することを確認

## 7. 実装時の手順書

### ステップ1: データベースの状態を確認

1. Supabaseダッシュボード → **SQL Editor**を開く
2. 上記のSQLクエリを実行
3. `user_facility_roles` にレコードが存在するか確認
4. 結果を記録

### ステップ2: RLSポリシーを修正

1. `supabase/migrations/024_fix_user_facility_roles_select_policy.sql` を作成
2. 修正案2のSQLを記述
3. Supabaseダッシュボードで実行
4. 成功を確認

### ステップ3: ブラウザで再試行

1. ブラウザで `/setup/create` を開く
2. 施設名を入力
3. 「施設を作成する」ボタンをクリック
4. `/home` にリダイレクトされることを確認

### ステップ4: 動作確認

1. `/home` に正しくリダイレクトされることを確認
2. ターミナルログで、ミドルウェアが「施設あり」と判定していることを確認
3. エラーが発生しないことを確認












