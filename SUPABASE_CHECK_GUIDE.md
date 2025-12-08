# Supabaseプロジェクトの動作確認ガイド

## ステップ1: Supabase Dashboardにアクセス

1. ブラウザで https://supabase.com にアクセス
2. ログイン（アカウントがない場合は作成）
3. プロジェクト一覧から `carebridge-hub-dev` を選択

## ステップ2: プロジェクトの状態を確認

### 2-1. プロジェクトのステータスを確認
- ダッシュボードの左上にプロジェクト名が表示されている
- プロジェクトのステータスが「Active」（緑色）になっていることを確認
- もし「Paused」や「Inactive」の場合は、プロジェクトを再開する必要があります

### 2-2. API設定を確認
1. 左側のメニューから「Settings」（設定）をクリック
2. 「API」をクリック
3. 以下を確認：
   - **Project URL**: `https://nwszimmkjrkzddypegzy.supabase.co` が表示されている
   - **anon public key**: 環境変数と同じ値が表示されている
   - **service_role key**: 環境変数と同じ値が表示されている

## ステップ3: 認証設定を確認

1. 左側のメニューから「Authentication」（認証）をクリック
2. 「Providers」（プロバイダー）を確認
3. 「Email」が有効になっていることを確認
4. 「Settings」タブで以下を確認：
   - **Site URL**: `http://localhost:3000` が設定されている（または `*` が設定されている）
   - **Redirect URLs**: `http://localhost:3000/**` が含まれている

## ステップ4: データベースの状態を確認

1. 左側のメニューから「Table Editor」をクリック
2. 以下のテーブルが存在することを確認：
   - `users`
   - `facilities`
   - `user_facility_roles`
   - `clients`
   - `posts`
   - `attachments`

## ステップ5: ネットワーク接続の確認

### 5-1. Supabase APIエンドポイントへの接続確認
ブラウザのコンソールで以下を実行：

```javascript
fetch('https://nwszimmkjrkzddypegzy.supabase.co/rest/v1/', {
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c3ppbW1ranJremRkeXBlZ3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk0MzIsImV4cCI6MjA3OTAyNTQzMn0.89bcJaYW23pf_GUa5gBkaWupaAXL1KaMbkXURC4zpPc'
  }
})
.then(response => console.log('Connection OK:', response.status))
.catch(error => console.error('Connection Error:', error))
```

### 5-2. 認証エンドポイントへの接続確認
ブラウザのコンソールで以下を実行：

```javascript
fetch('https://nwszimmkjrkzddypegzy.supabase.co/auth/v1/health', {
  method: 'GET'
})
.then(response => console.log('Auth Health OK:', response.status))
.catch(error => console.error('Auth Health Error:', error))
```

## ステップ6: CORS設定の確認

Supabaseは通常、CORSを自動的に設定していますが、確認するには：

1. Supabase Dashboard → Settings → API
2. 「CORS」セクションを確認
3. `http://localhost:3000` が許可されていることを確認

## トラブルシューティング

### CORSエラーが発生する場合

1. **開発サーバーを再起動**
   ```bash
   # ターミナルで Ctrl+C で停止
   npm run dev
   ```

2. **ブラウザのキャッシュをクリア**
   - Chrome: Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
   - 「キャッシュされた画像とファイル」を選択して削除

3. **環境変数の再読み込み**
   - 開発サーバーを再起動すると、環境変数が再読み込みされます

4. **Supabaseプロジェクトの再起動**
   - Supabase Dashboard → Settings → General
   - 「Restart project」をクリック（プロジェクトが一時停止している場合）



