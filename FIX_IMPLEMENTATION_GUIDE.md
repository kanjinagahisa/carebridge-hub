# 施設作成後のリダイレクト問題 - 修正実装ガイド

## 原因の確定

SQL実行結果から、以下が確認できました：

1. ✅ `user_facility_roles` に3つのレコードが存在
2. ✅ すべて `deleted = false`
3. ✅ すべて `user_id = 'ff73cb02-98c0-4139-b972-4c023482e257'`

**結論**: INSERTは成功しているが、ミドルウェアのクエリがRLSポリシーにより正しく結果を返せていない

## 原因: RLSポリシーの循環参照問題

現在のRLSポリシー（`supabase/migrations/002_rls_policies.sql` 56-61行目）:
```sql
CREATE POLICY "Users can view roles in their facilities"
  ON user_facility_roles FOR SELECT
  USING (
    facility_id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid()))
    AND deleted = FALSE
  );
```

**問題点**:
- `get_user_facility_ids(auth.uid())` は `user_facility_roles` テーブルを参照
- しかし、`user_facility_roles` の SELECT ポリシーは `get_user_facility_ids` の結果に依存
- これにより、循環参照が発生し、新しいレコードが正しく参照できない

## 修正案

### 修正案: RLSポリシーを修正（推奨）

**変更対象ファイル**: `supabase/migrations/024_fix_user_facility_roles_select_policy.sql`（新規作成済み）

**変更内容**:
- 循環参照を避けるため、`get_user_facility_ids` を使わず、直接 `user_id = auth.uid()` でチェック
- これにより、ユーザーは自分自身の `user_facility_roles` を直接参照できる

**SQL**:
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
- 既存のコードへの影響が小さい
- ミドルウェアのクエリが正しく動作するようになる

## 実装手順

### ステップ1: Supabaseダッシュボードでマイグレーションを実行

1. Supabaseダッシュボード → **SQL Editor**を開く
2. `supabase/migrations/024_fix_user_facility_roles_select_policy.sql` の内容をコピー＆ペースト
3. **「Run」ボタン**（緑色）をクリック
4. 成功メッセージが表示されることを確認

### ステップ2: ブラウザで再試行

1. ブラウザで `http://localhost:3001/setup/create` を開く
2. 施設名を入力（例：「テスト施設」）
3. **「施設を作成する」ボタン**をクリック
4. `/home` にリダイレクトされることを確認

### ステップ3: 動作確認

1. `/home` に正しくリダイレクトされることを確認
2. ターミナルログで、ミドルウェアが「施設あり」と判定していることを確認
3. エラーが発生しないことを確認

## 期待される結果

- ✅ 施設作成後、`/home` にリダイレクトされる
- ✅ ミドルウェアが `user_facility_roles` を正しく参照できる
- ✅ 「User has no facilities」のログが表示されない












