# トラブルシューティング確認ガイド

無限ループ問題の原因を特定するために、以下の項目を確認する手順を説明します。

---

## 1. Vercel のログ確認方法

### 1-1. Vercel ダッシュボードにアクセス

1. ブラウザで [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. ログイン（GitHub アカウントでログイン）

### 1-2. プロジェクトを選択

1. ダッシュボードで **CareBridge Hub** のプロジェクトをクリック
2. プロジェクトの詳細ページが表示されます

### 1-3. デプロイメント履歴を確認

1. 左メニューから **"Deployments"** をクリック
2. 最新のデプロイメント（一番上）をクリック
3. デプロイメントの詳細ページが表示されます

### 1-4. ログを確認

1. デプロイメント詳細ページで、**"Logs"** タブをクリック
2. ログが表示されます

### 1-5. ミドルウェアのログを検索

1. ログ画面の上部にある **"Filter"** または **"Search"** ボックスに `[Middleware]` と入力
2. ミドルウェアのログのみが表示されます

### 1-6. 確認すべきログメッセージ

以下のログメッセージを確認してください：

- `[Middleware] Request path: /home` - `/home` へのリクエストが来ているか
- `[Middleware] Auth cookies found: X` - 認証Cookieが検出されているか（X は数値）
- `[Middleware] User authenticated: ...` - ユーザーが認証されているか
- `[Middleware] No user found (not authenticated)` - ユーザーが認証されていない場合
- `[Middleware] Redirecting to /login (no authenticated user)` - `/login` にリダイレクトしている場合

### 1-7. リアルタイムログの確認（オプション）

1. デプロイメント詳細ページで、**"Functions"** タブをクリック
2. リアルタイムでログを確認できます

---

## 2. Vercel の環境変数確認方法

### 2-1. Vercel ダッシュボードにアクセス

1. ブラウザで [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. ログイン（GitHub アカウントでログイン）

### 2-2. プロジェクトを選択

1. ダッシュボードで **CareBridge Hub** のプロジェクトをクリック
2. プロジェクトの詳細ページが表示されます

### 2-3. 環境変数設定画面を開く

1. 左メニューから **"Settings"** をクリック
2. 左メニューから **"Environment Variables"** をクリック
3. 環境変数の一覧が表示されます

### 2-4. 確認すべき環境変数

以下の環境変数が設定されているか確認してください：

#### 必須環境変数

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - **値の形式**: `https://xxxxxxxxxxxxx.supabase.co`
   - **環境**: Production, Preview にチェックが入っているか
   - **確認方法**: 値が表示されているか（マスクされている場合は、右側の「表示」アイコンをクリック）

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - **値の形式**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）
   - **環境**: Production, Preview にチェックが入っているか
   - **確認方法**: 値が表示されているか（マスクされている場合は、右側の「表示」アイコンをクリック）

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - **値の形式**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）
   - **環境**: Production, Preview にチェックが入っているか
   - **確認方法**: 値が表示されているか（マスクされている場合は、右側の「表示」アイコンをクリック）

#### オプション環境変数（メール送信機能を使用する場合）

4. **`RESEND_API_KEY`**
   - **値の形式**: `re_xxxxxxxxxxxxx`
   - **環境**: Production, Preview にチェックが入っているか

5. **`RESEND_FROM_EMAIL`**
   - **値の形式**: `CareBridge Hub <noreply@yourdomain.com>`
   - **環境**: Production, Preview にチェックが入っているか

### 2-5. 環境変数の値が正しいか確認

各環境変数の値が、**本番Supabaseプロジェクト**の値と一致しているか確認してください。

#### `NEXT_PUBLIC_SUPABASE_URL` の確認方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 本番プロジェクト（`carebridge-hub-prod`）を選択
3. 左メニューから **"Settings"** → **"API"** をクリック
4. **"Project URL"** の値を確認
5. Vercel の環境変数 `NEXT_PUBLIC_SUPABASE_URL` の値と一致しているか確認

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY` の確認方法

1. Supabase Dashboard で、**"Settings"** → **"API"** を開く
2. **"Project API keys"** セクションで、**`anon` `public`** キーの値を確認
3. Vercel の環境変数 `NEXT_PUBLIC_SUPABASE_ANON_KEY` の値と一致しているか確認

#### `SUPABASE_SERVICE_ROLE_KEY` の確認方法

1. Supabase Dashboard で、**"Settings"** → **"API"** を開く
2. **"Project API keys"** セクションで、**`service_role` `secret`** キーの値を確認
3. Vercel の環境変数 `SUPABASE_SERVICE_ROLE_KEY` の値と一致しているか確認

### 2-6. 環境変数の修正方法

環境変数の値が間違っている場合：

1. 環境変数の行の右側にある **"..."** メニューをクリック
2. **"Edit"** を選択
3. 正しい値を入力
4. **"Save"** をクリック
5. **重要**: 環境変数を変更した後は、**新しいデプロイが必要**です
   - 左メニューから **"Deployments"** をクリック
   - 最新のデプロイメントの右側にある **"..."** メニューをクリック
   - **"Redeploy"** を選択

---

## 3. Supabase の設定確認方法

### 3-1. Supabase Dashboard にアクセス

1. ブラウザで [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. ログイン

### 3-2. 本番プロジェクトを選択

1. プロジェクト一覧から **本番プロジェクト**（例: `carebridge-hub-prod`）を選択
2. プロジェクトのダッシュボードが表示されます

### 3-3. 認証設定の確認

#### 3-3-1. 認証プロバイダーの確認

1. 左メニューから **"Authentication"** → **"Providers"** をクリック
2. **"Email"** プロバイダーが有効になっているか確認
3. **"Enable Email Signup"** が有効になっているか確認

#### 3-3-2. 認証URL設定の確認

1. 左メニューから **"Authentication"** → **"URL Configuration"** をクリック
2. 以下の設定を確認：

   **Site URL:**
   - 値: `https://carebridge-hub.vercel.app`
   - または、カスタムドメインを使用している場合はそのドメイン

   **Redirect URLs:**
   - 以下のURLが追加されているか確認：
     - `https://carebridge-hub.vercel.app/**`
     - `https://carebridge-hub.vercel.app/auth/callback`
     - `https://carebridge-hub.vercel.app/login`

#### 3-3-3. メールテンプレートの確認（オプション）

1. 左メニューから **"Authentication"** → **"Email Templates"** をクリック
2. メールテンプレートが正しく設定されているか確認

### 3-4. データベーススキーマの確認

#### 3-4-1. マイグレーションの確認

1. 左メニューから **"Database"** → **"Migrations"** をクリック
2. 以下のマイグレーションファイルが適用されているか確認：
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - その他のマイグレーションファイル

#### 3-4-2. テーブルの確認

1. 左メニューから **"Database"** → **"Tables"** をクリック
2. 以下のテーブルが存在するか確認：
   - `users`
   - `facilities`
   - `user_facility_roles`
   - `clients`
   - `groups`
   - `posts`
   - その他のテーブル

### 3-5. RLS（Row Level Security）ポリシーの確認

#### 3-5-1. RLS が有効になっているか確認

1. 左メニューから **"Database"** → **"Tables"** をクリック
2. 各テーブルをクリック
3. **"RLS"** タブをクリック
4. **"Enable Row Level Security"** が有効になっているか確認

#### 3-5-2. ポリシーの確認

1. 各テーブルの **"Policies"** タブをクリック
2. 必要なポリシーが設定されているか確認

### 3-6. API設定の確認

#### 3-6-1. API URL とキーの確認

1. 左メニューから **"Settings"** → **"API"** をクリック
2. 以下の情報を確認：
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys**:
     - **`anon` `public`**: 公開キー
     - **`service_role` `secret`**: 秘密キー（表示するには「表示」ボタンをクリック）

#### 3-6-2. Vercel の環境変数と一致しているか確認

1. Supabase Dashboard で確認した **Project URL** と **API keys** の値
2. Vercel の環境変数（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`）の値
3. これらが一致しているか確認

---

## 4. 確認結果の記録

以下の情報を記録してください：

### 4-1. Vercel のログ

- [ ] ミドルウェアのログが表示されているか
- [ ] `/home` へのリクエストが来ているか
- [ ] 認証Cookieが検出されているか（数値: _____）
- [ ] ユーザーが認証されているか
- [ ] `/login` にリダイレクトしているか

**確認結果:**
```
[ここにログの内容を貼り付けてください]
```

### 4-2. Vercel の環境変数

- [ ] `NEXT_PUBLIC_SUPABASE_URL` が設定されているか
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されているか
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が設定されているか
- [ ] 各環境変数の値が本番Supabaseプロジェクトの値と一致しているか

**確認結果:**
```
NEXT_PUBLIC_SUPABASE_URL: [設定されている / 設定されていない]
NEXT_PUBLIC_SUPABASE_ANON_KEY: [設定されている / 設定されていない]
SUPABASE_SERVICE_ROLE_KEY: [設定されている / 設定されていない]
```

### 4-3. Supabase の設定

- [ ] 認証プロバイダー（Email）が有効になっているか
- [ ] Site URL が正しく設定されているか
- [ ] Redirect URLs が正しく設定されているか
- [ ] データベーススキーマが適用されているか
- [ ] RLS ポリシーが設定されているか

**確認結果:**
```
認証プロバイダー: [有効 / 無効]
Site URL: [値]
Redirect URLs: [値]
データベーススキーマ: [適用済み / 未適用]
RLS ポリシー: [設定済み / 未設定]
```

---

## 5. よくある問題と解決方法

### 問題1: 環境変数が設定されていない

**症状:**
- ミドルウェアのログに `[Middleware] Missing Supabase environment variables` が表示される

**解決方法:**
1. Vercel の環境変数設定画面で、必要な環境変数を追加
2. 環境変数を追加した後、新しいデプロイを実行

### 問題2: 環境変数の値が間違っている

**症状:**
- ミドルウェアのログに `[Middleware] No user found (not authenticated)` が表示される
- しかし、クライアント側ではセッションが有効と判定される

**解決方法:**
1. Supabase Dashboard で、正しい **Project URL** と **API keys** を確認
2. Vercel の環境変数の値を修正
3. 新しいデプロイを実行

### 問題3: Redirect URLs が設定されていない

**症状:**
- 認証後にリダイレクトが失敗する
- エラーメッセージが表示される

**解決方法:**
1. Supabase Dashboard で、**"Authentication"** → **"URL Configuration"** を開く
2. **Redirect URLs** に、以下のURLを追加：
   - `https://carebridge-hub.vercel.app/**`
   - `https://carebridge-hub.vercel.app/auth/callback`
   - `https://carebridge-hub.vercel.app/login`

### 問題4: データベーススキーマが適用されていない

**症状:**
- テーブルが存在しない
- RLS ポリシーが設定されていない

**解決方法:**
1. Supabase Dashboard で、**"Database"** → **"Migrations"** を開く
2. 必要なマイグレーションファイルを適用
3. または、SQL Editor でマイグレーションファイルの内容を実行

---

## 6. 確認後の次のステップ

上記の確認を行った後、以下の情報を共有してください：

1. **Vercel のログ**: ミドルウェアのログの内容
2. **環境変数**: 各環境変数が設定されているか、値が正しいか
3. **Supabase の設定**: 認証設定、URL設定、データベーススキーマの状態

これらの情報があれば、問題の原因をより正確に特定し、解決策を提案できます。









