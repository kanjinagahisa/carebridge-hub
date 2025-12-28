# 施設作成後のリダイレクト問題 - 原因分析レポート

## 1. データの事実確認（要確認）

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
  f.name as facility_name
FROM user_facility_roles ufr
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.user_id = 'ff73cb02-98c0-4139-b972-4c023482e257'
  AND ufr.deleted = false
ORDER BY ufr.created_at DESC;

-- 3. 最近作成されたuser_facility_rolesを確認
SELECT 
  ufr.id,
  ufr.user_id,
  ufr.facility_id,
  ufr.role,
  ufr.created_at,
  f.name as facility_name
FROM user_facility_roles ufr
LEFT JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.deleted = false
ORDER BY ufr.created_at DESC
LIMIT 5;
```

## 2. コードの流れの分析

### 2-1. `/setup/create` のフォーム送信

**ファイル**: `app/setup/create/page.tsx`

**処理の流れ**:
1. フォーム送信時に `handleSubmit` が実行される
2. `/api/facilities/create` に POST リクエストを送信
   - Payload: `{ name: facilityName.trim() }`
3. レスポンスが 201 の場合、500ms 待機後に `window.location.href = '/home'` でリダイレクト

### 2-2. `/api/facilities/create` の処理

**ファイル**: `app/api/facilities/create/route.ts`

**処理の流れ**:
1. Cookieからセッション情報を取得・設定
2. ユーザー認証を確認（`finalUser`）
3. `adminSupabase`（service_roleキー使用）で施設を作成
   ```typescript
   const { data: facility, error: facilityError } = await adminSupabase
     .from('facilities')
     .insert({ name, type: 'other' })
     .select()
     .single()
   ```
4. `users`テーブルにユーザーが存在するか確認
   - 存在しない場合は作成
5. `user_facility_roles`にレコードを挿入
   ```typescript
   const { error: roleError } = await adminSupabase
     .from('user_facility_roles')
     .insert({
       user_id: finalUser.id,
       facility_id: facility.id,
       role: 'admin',
     })
   ```
6. 成功時は `{ facility }` を返す（201）

**問題点の可能性**:
- `roleError` が発生した場合、エラーレスポンスを返すが、`facility` は既に作成されている
- `roleError` のチェックが正しく動作しているか確認が必要

### 2-3. ミドルウェアの処理

**ファイル**: `lib/supabase/middleware.ts`

**処理の流れ**:
1. 認証済みユーザーを確認
2. `/setup` パス以外で、以下のクエリを実行：
   ```typescript
   const { data: roles, error: rolesError } = await supabase
     .from('user_facility_roles')
     .select('facility_id')
     .eq('user_id', finalUser.id)
     .eq('deleted', false)
   ```
3. `roles` が空配列または存在しない場合、`/setup/choose` にリダイレクト

**問題点の可能性**:
- クエリが正しく実行されているか
- `deleted = false` の条件が正しく機能しているか
- タイミングの問題（データベースの更新が反映される前にクエリが実行される）

## 3. 原因の特定（仮説）

### 仮説A: `user_facility_roles` への INSERT が失敗している

**根拠**:
- ターミナルログに `POST /api/facilities/create 201` が表示されている
- しかし、`roleError` のログが表示されていない
- API Route のコードでは、`roleError` が発生した場合、エラーレスポンスを返すはず

**確認方法**:
- 上記のSQLクエリで、`user_facility_roles` にレコードが存在するか確認

### 仮説B: INSERT は成功しているが、ミドルウェアのクエリが正しく動作していない

**根拠**:
- ミドルウェアは `user_facility_roles` テーブルを直接参照している
- RLSポリシーが影響している可能性
- クエリの条件（`deleted = false`）が正しく機能していない可能性

**確認方法**:
- ミドルウェアのログで、`rolesError` が発生しているか確認
- 実際のデータベースで、`user_facility_roles` にレコードが存在するか確認

### 仮説C: タイミングの問題

**根拠**:
- 施設作成後、500ms 待機してからリダイレクトしている
- しかし、データベースの更新が反映される前にミドルウェアが実行される可能性

**確認方法**:
- 待機時間を延長してテスト
- または、リダイレクト前に `user_facility_roles` の存在を確認

## 4. 推奨される確認手順

1. **SupabaseダッシュボードでSQLクエリを実行**
   - 上記のSQLクエリで、実際のデータを確認
   - `facilities` と `user_facility_roles` の両方にレコードが存在するか確認

2. **ターミナルログを再確認**
   - `[API]` プレフィックスのログで、`roleError` が発生していないか確認
   - ミドルウェアのログで、`rolesError` が発生していないか確認

3. **ブラウザのNetworkタブを確認**
   - `/api/facilities/create` のレスポンスボディを確認
   - `facility` オブジェクトが正しく返されているか確認












