# Vercel Previewデプロイガイド

このガイドでは、CareBridge HubをVercelにPreviewデプロイして動作確認する手順を説明します。

## ✅ 修正したファイル一覧と差分説明

### 1. `package.json`
- **変更内容**: `@types/web-push` を devDependencies に追加
- **理由**: TypeScriptビルドエラーを解消するため
- **差分**:
  ```json
  "devDependencies": {
    ...
    "@types/web-push": "^3.x.x"  // 追加
  }
  ```

### 2. `lib/server/push.ts`
- **変更内容**: VAPID公開鍵の環境変数名を統一
- **理由**: クライアント側とサーバー側で同じ環境変数名を使用するため
- **差分**:
  ```typescript
  // 変更前
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  
  // 変更後
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  ```
- **注意**: 後方互換性のため、`VAPID_PUBLIC_KEY` もサポートしていますが、`NEXT_PUBLIC_VAPID_PUBLIC_KEY` の使用を推奨します

### 3. その他のファイル
- **変更なし**: 既存のコードはVercelデプロイに対応済み

---

## 📋 Vercelの設定手順

### 方法1: GitHub連携（推奨）

1. **GitHubリポジトリの準備**
   - プロジェクトをGitHubにプッシュ
   - リポジトリが公開されていることを確認

2. **Vercelプロジェクトの作成**
   - [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
   - 「Add New...」→「Project」をクリック
   - GitHubリポジトリを選択
   - プロジェクト設定:
     - **Framework Preset**: Next.js
     - **Root Directory**: `./` (デフォルト)
     - **Build Command**: `npm run build` (デフォルト)
     - **Output Directory**: `.next` (デフォルト)
     - **Install Command**: `npm install` (デフォルト)

3. **環境変数の設定**（次のセクションを参照）

### 方法2: Vercel CLI（GitHub連携なし）

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトルートで実行
cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
vercel

# 初回実行時:
# - Vercelアカウントでログイン
# - プロジェクト名を入力
# - 設定を確認してデプロイ
```

---

## 🔐 Vercelに登録すべき環境変数の一覧

### 必須環境変数（Preview / Production共通）

以下の環境変数を **Vercel Dashboard → Project Settings → Environment Variables** で設定してください。

| 環境変数名 | 説明 | 設定場所 |
|-----------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | Preview, Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key（公開キー） | Preview, Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（秘密キー） | Preview, Production |

### オプション環境変数（機能を有効化する場合）

| 環境変数名 | 説明 | 設定場所 | 備考 |
|-----------|------|----------|------|
| `RESEND_API_KEY` | Resend APIキー | Preview, Production | メール送信機能用 |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス | Preview, Production | 例: `CareBridge Hub <noreply@yourdomain.com>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID公開鍵 | Preview, Production | Web Push通知用（クライアント側） |
| `VAPID_PRIVATE_KEY` | VAPID秘密鍵 | Preview, Production | Web Push通知用（サーバー側） |
| `VAPID_SUBJECT` | VAPID Subject | Preview, Production | デフォルト: `mailto:admin@example.com` |

### 環境変数の設定手順（Vercel Dashboard）

1. Vercel Dashboard → プロジェクト選択 → **Settings** → **Environment Variables**
2. 各環境変数を追加:
   - **Name**: 環境変数名（例: `NEXT_PUBLIC_SUPABASE_URL`）
   - **Value**: 値（ローカルの `.env.local` からコピー）
   - **Environment**: Preview, Production の両方にチェック
3. 「Save」をクリック
4. **重要**: 環境変数を追加した後、**新しいデプロイを実行**してください（既存のデプロイには反映されません）

### 環境変数の取得方法

#### Supabase環境変数
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクト選択 → **Settings** → **API**
3. 以下を取得:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 秘密キーなので取り扱いに注意）

#### VAPIDキー（Web Push通知用）
```bash
# ローカルで実行
npx web-push generate-vapid-keys

# 出力例:
# Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI...
# Private Key: YnJzT15a1VoX...
```

---

## 🔗 Supabase側のURL許可設定（重要）

Previewドメインで認証が動作するように、Supabase側でRedirect URLsを追加する必要があります。

### 設定手順

1. **Supabase Dashboard** にアクセス
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. **Authentication設定を開く**
   - 左メニュー → **Authentication** → **URL Configuration**

3. **Site URLの確認**
   - **Site URL** は本番URL（またはPreview URL）に設定
   - 例: `https://your-project.vercel.app`

4. **Redirect URLsに追加**
   - **Redirect URLs** セクションに以下を追加（1行ずつ）:
     ```
     https://your-project-*.vercel.app/**
     https://your-project-git-*.vercel.app/**
     ```
   - または、具体的なPreview URLを追加:
     ```
     https://your-project-abc123.vercel.app/**
     ```
   - ワイルドカード `*` を使用することで、すべてのPreview URLを許可できます

5. **保存**
   - 「Save」をクリック

### 設定例

```
Site URL: https://carebridge-hub.vercel.app

Redirect URLs:
https://carebridge-hub-*.vercel.app/**
https://carebridge-hub-git-*.vercel.app/**
http://localhost:3000/**
```

### 注意事項

- Preview URLは、Vercelが自動生成するため、デプロイ後に確認してください
- ワイルドカード `*` を使用することで、すべてのPreview URLに対応できます
- 本番環境用のURLも別途追加してください

---

## 🚀 デプロイと動作確認

### デプロイの実行

#### GitHub連携の場合
- GitHubにプッシュすると自動的にPreviewデプロイが開始されます
- Vercel Dashboardでデプロイ状況を確認できます

#### CLIの場合
```bash
vercel --prod  # Productionデプロイ
vercel         # Previewデプロイ
```

### Preview URLでの動作確認チェックリスト

デプロイ完了後、Preview URL（例: `https://your-project-abc123.vercel.app`）で以下を確認してください。

#### ✅ 基本動作確認

- [ ] **ログイン画面の表示**
  - Preview URLにアクセス
  - `/login` ページが正しく表示される
  - エラーが表示されない

- [ ] **ログイン機能**
  - 既存のアカウントでログイン
  - ログイン成功後、`/home` にリダイレクトされる
  - 認証エラーが発生しない

- [ ] **認証Cookie/セッションの維持**
  - ログイン後、ページをリロードしてもログイン状態が維持される
  - 別のページ（例: `/clients`）に遷移しても認証が維持される
  - ログアウトボタンで正常にログアウトできる

- [ ] **画面遷移**
  - `/home` → `/clients` → `/groups` など、主要な画面遷移が正常に動作する
  - 認証が必要なページに未認証でアクセスした場合、`/login` にリダイレクトされる

#### ✅ 認証フロー確認

- [ ] **サインアップ**
  - `/signup` で新規アカウント作成ができる
  - メール認証（Supabase Auth）が正常に動作する

- [ ] **パスワードリセット**
  - `/auth/forgot-password` でパスワードリセットメールが送信される
  - リセットリンクからパスワード変更ができる

#### ✅ Web Push通知（オプション）

- [ ] **Push通知トグルの表示**
  - `/settings/notifications` でPush通知トグルが表示される
  - ブラウザがWeb Pushに対応している場合、トグルが有効になる

- [ ] **Push通知の購読**
  - トグルをONにすると、ブラウザの通知許可ダイアログが表示される
  - 許可後、購読が正常に完了する（エラーが表示されない）

#### ✅ エラー確認

- [ ] **コンソールエラーの確認**
  - ブラウザの開発者ツール（F12）→ Console を開く
  - 重大なエラー（赤色）が表示されていない
  - 警告（黄色）は許容範囲内

- [ ] **ネットワークエラーの確認**
  - 開発者ツール → Network を開く
  - APIリクエストが正常に完了している（200, 201など）
  - 認証エラー（401, 403）が発生していない

### トラブルシューティング

#### 認証エラーが発生する場合

1. **Supabase Redirect URLsの確認**
   - Supabase Dashboard → Authentication → URL Configuration
   - Preview URLが正しく追加されているか確認

2. **環境変数の確認**
   - Vercel Dashboard → Settings → Environment Variables
   - `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか確認

3. **デプロイログの確認**
   - Vercel Dashboard → Deployments → 最新デプロイ → Logs
   - エラーメッセージを確認

#### ビルドエラーが発生する場合

1. **ローカルでビルド確認**
   ```bash
   npm run build
   ```
   - ローカルでビルドが成功することを確認

2. **環境変数の確認**
   - 必須環境変数がすべて設定されているか確認

#### Web Push通知が動作しない場合

1. **VAPIDキーの確認**
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` と `VAPID_PRIVATE_KEY` が設定されているか確認
   - ローカルとVercelで同じキーを使用しているか確認

2. **HTTPSの確認**
   - Preview URLはHTTPSなので、Web Pushは動作するはずです
   - iOS Safariの制約により、PWAとしてインストールする必要がある場合があります

---

## 📝 次のステップ

Previewデプロイが成功したら、以下を検討してください:

1. **Productionデプロイ**
   - 本番環境用の環境変数を設定
   - カスタムドメインの設定（オプション）

2. **監視とログ**
   - Vercel Analyticsの有効化
   - エラーログの監視

3. **パフォーマンス最適化**
   - 画像最適化の確認
   - バンドルサイズの最適化

---

## 🔗 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)

