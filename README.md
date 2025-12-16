# CareBridge Hub（ケアブリッジ・ハブ）

介護・福祉向け情報共有アプリのMVP（v1）

## 概要

CareBridge Hubは、介護・福祉施設（放課後デイ、デイサービス、老健、サービス付き高齢者住宅など）で使える、多職種連携・情報共有用のクローズドなSNS風アプリです。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript + React + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage)
- **認証**: Supabase Auth（メール＋パスワード認証）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# メール送信設定（Resend）
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=CareBridge Hub <noreply@yourdomain.com>

# Web Push通知設定（VAPID）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

**メール送信設定について:**
- パスワード変更完了メールの送信には [Resend](https://resend.com) を使用します
- Resendアカウントを作成し、APIキーを取得してください（無料プラン: 月間3,000通）
- `RESEND_FROM_EMAIL` は送信元メールアドレスです（例: `CareBridge Hub <noreply@yourdomain.com>`）
- `RESEND_API_KEY` が設定されていない場合、メール送信はスキップされます（ログ出力のみ）

**SupabaseカスタムSMTP設定（オプション）:**
- Supabase Authが送信する認証メール（パスワード再設定メールなど）の送信制限を緩和するには、Supabase DashboardでカスタムSMTP設定を行ってください
- 詳細は `SUPABASE_SMTP_SETUP_GUIDE.md` を参照してください
- この設定により、1日30通の制限を緩和できます（Resend無料プラン: 月間3,000通）

**Web Push通知設定について:**
- Web Push通知にはVAPIDキーが必要です
- `npm install -g web-push` で web-push をインストール後、`web-push generate-vapid-keys` コマンドでキーペアを生成してください
- 生成した公開鍵を `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、秘密鍵を `VAPID_PRIVATE_KEY` に設定してください
- Vercelにも同じ環境変数を設定してください

### 4. データベーススキーマの適用

SupabaseのSQL Editorで、以下の順序でマイグレーションファイルを実行してください：

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/066_push_subscriptions.sql`（Web Push通知を使用する場合）

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 本番デプロイ

本番環境へのデプロイは、**Vercel** を使用します。

詳細な手順は [`docs/deployment-vercel.md`](./docs/deployment-vercel.md) を参照してください。

### 概要

1. GitHub リポジトリを Vercel に連携
2. 本番 Supabase プロジェクトの環境変数を設定
3. 初回デプロイ後の動作確認

## 主な機能

### 認証
- メールアドレス＋パスワードによるサインアップ／ログイン
- セッション管理

### 施設・ユーザー管理
- 施設（事業所）の登録
- ユーザーと施設の紐づけ（1ユーザーが複数施設に所属可能）
- ロール管理（管理者／一般職員）

### 利用者管理
- 利用者の登録・一覧表示
- 利用者詳細情報（基本情報・メモ）
- 利用者ごとのグループ

### グループ管理
- 利用者グループ
- 多職種グループ
- コミュニティ

### タイムライン
- 介護側／利用者側の2つのタイムライン
- 投稿・リアクション・しおり機能
- 既読管理
- ファイル添付（画像・PDF等）

### その他
- 未読メッセージ一覧
- しおり一覧
- プロフィール編集
- 利用規約・プライバシーポリシー

## プロジェクト構造

```
.
├── app/                    # Next.js App Router
│   ├── home/              # ホーム画面
│   ├── clients/           # 利用者一覧・詳細
│   ├── groups/            # グループ一覧・タイムライン
│   ├── connections/       # つながり（将来実装）
│   ├── menu/              # メニュー・プロフィール
│   ├── login/             # ログイン
│   ├── signup/            # サインアップ
│   ├── terms/             # 利用規約
│   └── privacy/            # プライバシーポリシー
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ・設定
│   ├── supabase/         # Supabaseクライアント
│   └── constants.ts       # 定数定義
├── supabase/
│   └── migrations/       # データベースマイグレーション
└── middleware.ts          # Next.jsミドルウェア
```

## データベーススキーマ

主要なテーブル：

- `facilities` - 施設
- `users` - ユーザー（Supabase Authと連動）
- `user_facility_roles` - ユーザーと施設の紐づけ
- `clients` - 利用者
- `groups` - グループ
- `group_members` - グループメンバー
- `posts` - 投稿
- `post_reactions` - リアクション
- `post_bookmarks` - しおり
- `post_reads` - 既読管理
- `attachments` - 添付ファイル

詳細は `supabase/migrations/001_initial_schema.sql` を参照してください。

## セキュリティ

- Row Level Security (RLS) により、施設単位でデータアクセスを制御
- ユーザーは自分が所属する施設のデータのみ閲覧可能
- Supabase Authによる認証・認可

## 今後の拡張予定

- ビデオ通話機能（WebRTC連携）
- ファイルアップロード機能の完全実装
- 通知機能
- 検索機能の強化
- つながり機能の実装

## ライセンス

このプロジェクトはプライベートプロジェクトです。


