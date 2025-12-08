# CareBridge Hub — Vercel 本番デプロイ手順書

## 📋 目次

1. [前提条件](#前提条件)
2. [Vercel プロジェクト作成手順](#vercel-プロジェクト作成手順)
3. [Build & Output 設定](#build--output-設定)
4. [Environment Variables 設定手順](#environment-variables-設定手順)
5. [Supabase メールテンプレートの日本語化（オプション）](#supabase-メールテンプレートの日本語化オプション)
6. [初回デプロイ後の確認項目](#初回デプロイ後の確認項目)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

本番デプロイを行う前に、以下が整っていることを確認してください：

- ✅ **GitHub アカウント**を持っていること
- ✅ **CareBridge Hub のリポジトリが GitHub に push 済み**であること
- ✅ **Supabase 本番プロジェクトが作成済み**であること
  - Supabase 本番プロジェクトの URL
  - Supabase 本番プロジェクトの `anon` `public` キー
  - Supabase 本番プロジェクトの `service_role` キー（Settings → API → Project API keys → `service_role` `secret`）
- ✅ **Resend アカウントが作成済み**であること（メール送信機能を使用する場合）
  - Resend API キー
  - 送信元メールアドレス（Resend でドメイン認証済みのもの）

---

## Vercel プロジェクト作成手順

### 1. Vercel にサインアップ / ログイン

1. [Vercel](https://vercel.com) にアクセス
2. GitHub アカウントでサインアップまたはログイン

### 2. 新しいプロジェクトを作成

1. Vercel ダッシュボードで **"Add New..."** → **"Project"** をクリック
2. GitHub リポジトリ一覧から **CareBridge Hub のリポジトリ**を選択
3. **"Import"** をクリック

### 3. プロジェクト設定

Vercel が自動的に以下を検出します：

- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: `./`（プロジェクトルート）

これらの設定は **デフォルトのままで OK** です。

---

## Build & Output 設定

Vercel が自動的に以下を設定します。**基本的に変更不要**です：

- **Build Command**: `next build`（デフォルト）
- **Output Directory**: `.next`（デフォルト）
- **Install Command**: `npm install`（`package.json` の `packageManager` フィールドがあればそれに従う）

### 確認方法

プロジェクト設定画面（**"Settings"** → **"General"**）で以下を確認してください：

```
Framework Preset: Next.js
Build Command: next build
Output Directory: .next
Install Command: npm install（または yarn/pnpm）
```

---

## Environment Variables 設定手順

⚠️ **重要**: 本番環境では、**本番 Supabase プロジェクト**の値を使用してください。開発環境（dev）の値は使用しないでください。

### 1. Environment Variables 画面を開く

1. Vercel プロジェクトの **"Settings"** タブをクリック
2. 左メニューから **"Environment Variables"** を選択

### 2. 環境変数を登録

以下の環境変数を **全て** 登録してください。各変数について、**"Production"**、**"Preview"**、**"Development"** の環境に適用するか選択してください。

#### 必須環境変数

| 環境変数名 | 説明 | 値の取得元 | 環境 |
|-----------|------|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | Supabase Dashboard → Settings → API → Project URL | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開可） | Supabase Dashboard → Settings → API → Project API keys → `anon` `public` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（**秘密**） | Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret` | Production, Preview |

#### メール送信関連（オプション）

メール送信機能（パスワード変更完了メールなど）を使用する場合のみ設定してください。

| 環境変数名 | 説明 | 値の取得元 | 環境 |
|-----------|------|-----------|------|
| `RESEND_API_KEY` | Resend API キー | Resend Dashboard → API Keys | Production, Preview |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス | Resend で認証済みのドメインを使用（例: `CareBridge Hub <noreply@yourdomain.com>`） | Production, Preview |
| `RESEND_TEST_EMAIL` | テスト用メールアドレス（**オプション**） | 任意のメールアドレス（テスト環境でのみ使用） | Preview のみ |

### 3. 環境変数の登録手順（詳細）

各環境変数について：

1. **"Key"** 欄に環境変数名を入力（例: `NEXT_PUBLIC_SUPABASE_URL`）
2. **"Value"** 欄に値を入力
3. **環境の選択**:
   - ✅ **Production**: 本番環境に適用
   - ✅ **Preview**: プレビュー環境（PR ごとのデプロイ）に適用
   - ⚠️ **Development**: ローカル開発環境（通常は使用しない）
4. **"Save"** をクリック

### 4. 環境変数の確認

登録後、以下のように表示されることを確認してください：

```
✅ NEXT_PUBLIC_SUPABASE_URL
   Production, Preview

✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
   Production, Preview

✅ SUPABASE_SERVICE_ROLE_KEY
   Production, Preview

✅ RESEND_API_KEY (オプション)
   Production, Preview

✅ RESEND_FROM_EMAIL (オプション)
   Production, Preview
```

---

## Supabase メールテンプレートの日本語化（オプション）

Supabase Auth が送信する確認メールを日本語化するには、Supabase Dashboard でメールテンプレートを編集してください。

### 手順

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 本番プロジェクト（`carebridge-hub-prod`）を選択
3. 左メニューから **"Authentication"** → **"Email Templates"** を開く
4. 以下のテンプレートを編集します：

#### 1. Confirm signup（新規登録確認メール）

**Subject（件名）:**
```
CareBridge Hub アカウント登録のご確認
```

**Body（本文）:**
```
以下のリンクをクリックして、アカウント登録を完了してください：

{{ .ConfirmationURL }}

このメールに心当たりがない場合は、このメールを無視していただいて構いません。

---
CareBridge Hub
介護・福祉向け情報共有アプリ
```

#### 2. Magic Link（マジックリンク）※使用しない場合は変更不要

#### 3. Change Email Address（メールアドレス変更確認）※使用しない場合は変更不要

#### 4. Reset Password（パスワードリセット）

**Subject（件名）:**
```
CareBridge Hub パスワードリセットのご案内
```

**Body（本文）:**
```
パスワードをリセットするには、以下のリンクをクリックしてください：

{{ .ConfirmationURL }}

このリンクは24時間有効です。

このメールに心当たりがない場合は、このメールを無視していただいて構いません。

---
CareBridge Hub
介護・福祉向け情報共有アプリ
```

### テンプレートの編集方法

1. 各テンプレート（Confirm signup、Reset Password など）を選択
2. **"Subject"** 欄に日本語の件名を入力
3. **"Body"** 欄に日本語の本文を入力
4. `{{ .ConfirmationURL }}` などの変数はそのまま残してください（これが実際のリンクに置き換わります）
5. **"Save"** をクリック

---

## 初回デプロイ後の確認項目

環境変数の設定が完了したら、**"Deployments"** タブに戻り、初回デプロイが完了するまで待機してください（通常 1-3 分）。

デプロイが完了したら、以下の項目を順番に確認してください：

### 1. 基本動作確認

- [ ] 本番 URL（例: `https://carebridge-hub.vercel.app`）にアクセスできる
- [ ] ログイン画面が表示される
- [ ] ブラウザのコンソール（F12 → Console タブ）に **エラーが出ていない**

### 2. 認証機能の確認

- [ ] ログインが正常に動作する
- [ ] ログイン後に `/home` に遷移する
- [ ] ログアウトが正常に動作する

### 3. 主要機能の確認

- [ ] **ホーム画面**: 新着投稿が表示される
- [ ] **利用者一覧** (`/clients`): 利用者リストが表示される
- [ ] **利用者タイムライン** (`/clients/[id]/timeline`): 投稿が表示される
- [ ] **グループ一覧** (`/groups`): グループリストが表示される
- [ ] **グループタイムライン** (`/groups/[id]`): 投稿が表示される
- [ ] **施設設定** (`/settings/facility`): 施設情報が表示される（管理者のみ）
- [ ] **招待機能** (`/settings/facility/invite`): 招待リンクが生成できる（管理者のみ）

### 4. UI 要素の確認

- [ ] **ロゴ表示**: ログイン画面とヘッダーにロゴが正しく表示される
- [ ] **施設名表示**: ホーム画面、メニュー画面、つながり画面のヘッダーに施設名が表示される
- [ ] **利用規約** (`/terms`): 全文が表示される
- [ ] **プライバシーポリシー** (`/privacy`): 全文が表示される

### 5. メール送信機能の確認（オプション）

- [ ] **パスワード再設定**: `/auth/forgot-password` からパスワード再設定メールが送信される
- [ ] **パスワード変更完了メール**: パスワード変更後に完了メールが送信される

### 6. スマートフォン対応の確認

- [ ] iPhone / Android でアクセスして、レイアウトが崩れていない
- [ ] フォームの入力が正常に動作する

---

## トラブルシューティング

### 問題: デプロイが失敗する

**原因**: 環境変数が不足している、または Build エラーが発生している

**解決方法**:
1. Vercel の **"Deployments"** タブで失敗したデプロイをクリック
2. **"Build Logs"** を確認
3. 環境変数が不足している場合は、**"Settings"** → **"Environment Variables"** で追加
4. Build エラーの場合は、ローカルで `npm run build` を実行してエラーを確認

### 問題: ログインできない

**原因**: Supabase の環境変数が間違っている、または本番 Supabase プロジェクトにデータベーススキーマが適用されていない

**解決方法**:
1. Vercel の環境変数が正しいか確認（**Settings** → **Environment Variables**）
2. 本番 Supabase プロジェクトで、以下の SQL ファイルを実行済みか確認:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
3. 本番 Supabase プロジェクトの **Authentication** → **Users** で、ユーザーが作成されているか確認

### 問題: 画像やロゴが表示されない

**原因**: 静的ファイルのパスが間違っている、または `next.config.js` の設定が不足している

**解決方法**:
1. `public/assets/` ディレクトリ内のファイルが GitHub にコミットされているか確認
2. Vercel のデプロイログで、ファイルのアップロードエラーが出ていないか確認

### 問題: メールが送信されない

**原因**: Resend の環境変数が設定されていない、または API キーが無効

**解決方法**:
1. Vercel の環境変数で `RESEND_API_KEY` と `RESEND_FROM_EMAIL` が設定されているか確認
2. Resend Dashboard で API キーが有効か確認
3. Resend Dashboard で送信元ドメインが認証済みか確認

### 問題: コンソールにエラーが出る

**原因**: 環境変数の不足、または Supabase への接続エラー

**解決方法**:
1. ブラウザのコンソール（F12 → Console タブ）でエラーメッセージを確認
2. エラーが `Missing Supabase environment variables` の場合は、環境変数の設定を確認
3. エラーが `Failed to fetch` の場合は、Supabase の URL とキーが正しいか確認

---

## カスタムドメインの設定（オプション）

将来的にカスタムドメイン（例: `carebridge-hub.com`）を設定する場合:

1. Vercel プロジェクトの **"Settings"** → **"Domains"** を開く
2. **"Add Domain"** をクリック
3. ドメイン名を入力
4. Vercel の指示に従って DNS レコードを設定

詳細は [Vercel のドメイン設定ドキュメント](https://vercel.com/docs/concepts/projects/domains) を参照してください。

---

## 今後の更新デプロイ

GitHub に push すると、Vercel が自動的に新しいデプロイを開始します：

1. ローカルで変更をコミット: `git commit -m "Update..."`
2. GitHub に push: `git push origin main`（または `master`）
3. Vercel が自動的にデプロイを開始（通常 1-3 分で完了）
4. **"Deployments"** タブでデプロイ状況を確認

---

## まとめ

- ✅ GitHub リポジトリを Vercel に連携
- ✅ 本番 Supabase プロジェクトの環境変数を設定
- ✅ 初回デプロイ後の動作確認
- ✅ 今後の更新は GitHub push で自動デプロイ

問題が発生した場合は、上記の **トラブルシューティング** セクションを参照してください。

