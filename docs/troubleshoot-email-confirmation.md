# 確認メールが届かない問題のトラブルシューティング

## 考えられる原因

1. **Supabaseのメール送信制限**
   - 無料プランでは1日30通まで
   - 制限に達している可能性

2. **Supabaseの設定**
   - Site URLが正しく設定されていない
   - Redirect URLsに本番URLが追加されていない
   - メール確認が必要な設定になっているか

3. **メールアドレスの問題**
   - スパムフォルダに入っている
   - メールアドレスの入力ミス

4. **カスタムSMTP設定**
   - カスタムSMTPが設定されていない場合、Supabaseのデフォルトメール送信を使用
   - デフォルトでは制限がある

## 確認手順

### ステップ1: Supabase Dashboardでユーザーを確認

1. Supabase Dashboardにアクセス
2. プロジェクト（`carebridge-hub-prod`）を選択
3. **Authentication** → **Users** をクリック
4. 新規登録したメールアドレスを検索
5. ユーザーの状態を確認：
   - **Email Confirmed**: `false` の場合、メール確認が必要
   - **Confirmation Sent At**: メール送信時刻が記録されているか確認

### ステップ2: Supabaseのメール設定を確認

1. **Authentication** → **URL Configuration** をクリック
2. 以下を確認：
   - **Site URL**: `https://carebridge-hub.vercel.app` が設定されているか
   - **Redirect URLs**: `https://carebridge-hub.vercel.app/**` が追加されているか

### ステップ3: メール送信ログを確認

1. **Logs** → **Postgres Logs** をクリック
2. メール送信に関連するエラーログがないか確認

### ステップ4: カスタムSMTP設定を確認

1. **Settings** → **Auth** → **SMTP Settings** をクリック
2. カスタムSMTPが設定されているか確認
3. 設定されていない場合、メール送信はSupabaseのデフォルトを使用（制限あり）

## 解決方法

### 方法1: カスタムSMTPを設定する（推奨）

Resendなどのメール送信サービスを使用して、カスタムSMTPを設定します。

詳細は `SUPABASE_SMTP_SETUP_GUIDE.md` を参照してください。

### 方法2: メール確認を一時的に無効化する（開発・テスト用）

**注意**: 本番環境では推奨されません。

1. **Authentication** → **Providers** → **Email** をクリック
2. **Enable email confirmations** のチェックを外す
3. **Save** をクリック

これにより、メール確認なしでログインできるようになります。

### 方法3: 手動でメール確認を完了させる（テスト用）

1. Supabase Dashboard → **Authentication** → **Users** をクリック
2. 対象ユーザーをクリック
3. **Send confirmation email** ボタンをクリック
4. または、**Actions** → **Confirm user** をクリックして手動で確認

## デバッグ用SQLクエリ

Supabase SQL Editorで以下を実行して、ユーザーの状態を確認：

```sql
-- 最新のユーザーを確認
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

## 次のステップ

1. 上記の確認手順を実行
2. 問題が特定できたら、適切な解決方法を選択
3. カスタムSMTPを設定することを推奨（本番環境）









