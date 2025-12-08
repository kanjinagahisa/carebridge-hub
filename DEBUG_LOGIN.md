# ログイン問題のデバッグガイド

## 考えられる根本原因

### 1. メール確認が完了していない
- **症状**: ログイン時にセッションが確立されない
- **確認方法**: Supabaseダッシュボード → Authentication → Users でユーザーの `email_confirmed_at` を確認
- **解決方法**: メール確認を完了するか、開発環境でメール確認を無効化

### 2. 環境変数の設定ミス
- **症状**: Supabaseへの接続が失敗する
- **確認方法**: `.env.local` ファイルの内容を確認
- **解決方法**: 正しいSupabase URLとAnon Keyを設定

### 3. Supabaseの認証設定（メール確認の有効/無効）
- **症状**: ログインしてもセッションが確立されない
- **確認方法**: Supabaseダッシュボード → Authentication → Settings → Email Auth
- **解決方法**: 開発環境では「Enable email confirmations」をオフにする

### 4. セッションクッキーの設定問題
- **症状**: ログイン成功後にセッションが保持されない
- **確認方法**: ブラウザの開発者ツール → Application → Cookies でセッションクッキーを確認
- **解決方法**: クッキーの設定を確認

### 5. ミドルウェアのリダイレクトループ
- **症状**: ログイン後にログインページに戻される
- **確認方法**: ネットワークタブでリダイレクトの連鎖を確認
- **解決方法**: ミドルウェアのロジックを確認

### 6. コンソールエラーの確認不足
- **症状**: エラーが表示されていないが動作しない
- **確認方法**: ブラウザのコンソールでエラーを確認
- **解決方法**: エラーメッセージに基づいて修正

## 確認手順

### Step 1: ブラウザのコンソールでログを確認
1. ブラウザで http://localhost:3000/login を開く
2. F12キーで開発者ツールを開く
3. Consoleタブを選択
4. メールアドレスとパスワードを入力してログイン
5. コンソールに表示されるログを確認：
   - `Attempting login with email: ...`
   - `Login response: ...`
   - エラーメッセージがあれば記録

### Step 2: ネットワークタブでリクエストを確認
1. 開発者ツールのNetworkタブを開く
2. ログインを実行
3. `/auth/v1/token` へのリクエストを確認
4. ステータスコードとレスポンスを確認

### Step 3: Supabaseダッシュボードでユーザー状態を確認
1. Supabaseダッシュボード → Authentication → Users
2. ログインしようとしているユーザーを探す
3. 以下を確認：
   - `email_confirmed_at` が設定されているか
   - `last_sign_in_at` が更新されているか
   - `confirmed_at` が設定されているか

### Step 4: 環境変数の確認
1. `.env.local` ファイルを開く
2. 以下が正しく設定されているか確認：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 5: Supabaseの認証設定を確認
1. Supabaseダッシュボード → Authentication → Settings
2. 「Enable email confirmations」の状態を確認
3. 開発環境では無効にすることを推奨


