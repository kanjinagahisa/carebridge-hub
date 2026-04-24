# CareBridge Hub — CLAUDE.md

AI engineering guide for Claude Code working on this repository.

---

## 1. プロジェクト概要

**CareBridge Hub** は介護・福祉施設向けの情報共有・連携 Web アプリ（PWA）。

対象ユーザー:
- **施設スタッフ（一般職員）**: 利用者記録の閲覧・投稿、グループ情報共有
- **施設管理者（admin）**: 施設設定、スタッフ招待、グループの権限・設定管理（※作成はスタッフ全員可能）
- 一人のユーザーが複数施設に所属可能（`FacilitySwitcher` で切り替え）

保護者（家族）向けロール・画面は現状存在しない。

---

## 2. 技術スタック

| 分類 | 技術 |
|------|------|
| Framework | Next.js 14（App Router） |
| Language | TypeScript 5.x |
| Database / Auth | Supabase（PostgreSQL + Supabase Auth） |
| Styling | Tailwind CSS 3.x + CSS variables（`globals.css`） |
| Hosting | Vercel（`docs/deployment-vercel.md` 参照） |
| メール送信 | Resend |
| プッシュ通知 | Web Push（VAPID）、`push_subscriptions` テーブル |
| UI / アイコン | lucide-react |
| 日付処理 | date-fns |
| Lint | ESLint（eslint-config-next） |

Supabase クライアント:
- `@supabase/ssr` — サーバー / ミドルウェア用
- `@supabase/supabase-js` — admin（service_role）用

---

## 3. ディレクトリ構造

```
app/              # Next.js App Router
  layout.tsx      # ルートレイアウト（メタデータ・PWA・globals.css）
  page.tsx        # / → /home へ redirect
  login/          # Client Component（フォーム）
  signup/
  auth/           # forgot-password / reset-password
  setup/          # choose / create / join
  invite/[code]/  # 招待コード参加
  home/           # layout（TabBar）+ page / unread / bookmarks
  groups/         # [id]/ timeline・投稿
  clients/        # [id]/ timeline・memo・documents
  connections/
  menu/           # profile / FacilitySwitcher
  settings/       # notifications / facility / facility/invite
  api/            # Route Handlers（route.ts）

components/
  # home / groups / client / settings / menu / common に機能別分類

lib/
  supabase/       # client.ts / server.ts / middleware.ts / admin.ts / api.ts
  utils/          # auth.ts / auth-server.ts / client.ts / email.ts / notifications.ts
  api/            # clients.ts / clients-server.ts
  server/         # push.ts（Web Push 送信）
  webpush/        # vapid.ts
  constants.ts    # 施設タイプ・職種・ロール・グループタイプ・リアクション等の定数
  validators.ts

types/
  carebridge.ts   # ドメイン型（Client / Group / Post / Attachment 等）

supabase/
  migrations/     # スキーマ・RLS 変更履歴（002〜069 付近）
  sql/
```

---

## 4. 認証・セッション

- **Supabase Auth**（メール/パスワード）、Cookie ベース（`@supabase/ssr`）
- **ミドルウェア** (`middleware.ts` → `lib/supabase/middleware.ts` の `updateSession`):
  - 未認証 → `/login` にリダイレクト
  - 施設未所属 → `/setup/choose` にリダイレクト（`createAdminClient()` で `user_facility_roles` を確認）
- **Server Component でのセッション取得**: `lib/supabase/server.ts` の `createClient()` を使用。多くのページで Cookie から `setSession` → `getUser()` するパターンが繰り返されている
- **Admin クライアント** (`lib/supabase/admin.ts`、`SUPABASE_SERVICE_ROLE_KEY`):
  - **サーバー側のみ**使用すること
  - RLS をバイパスするため、使用箇所・目的を必ず意識する
  - 読み取りでの安易な使用は避け、どうしても必要な操作に限定する

---

## 5. データ取得パターン

- **Server Component がデフォルト**: 一覧・詳細ページはサーバーでデータ取得し、props で Client に渡す
- **Client Component (`'use client'`)**: フォーム・モーダル・状態操作・ブラウザ API が必要な場合のみ付与
- **認証が必要なページ**: `export const dynamic = 'force-dynamic'` を指定
- **API Route** (`app/api/`):
  - `createApiClient(request)` — Cookie からセッションを復元（`lib/supabase/api.ts`）
  - `createAdminClient()` — RLS バイパスが必要な場合のみ

---

## 6. Supabase 利用方針

- **Auth**: 使用中（メール/パスワード）
- **Database**: 使用中（全テーブルに RLS 有効）
- **Storage**: 使用中（`attachments` バケット）。パス形式: `{client_id|group_id}/{filename}`
- **Edge Functions**: **未使用**（メール送信は Resend、Web Push は API Route から）
- **RLS の考え方**: 基本は RLS で権限制御。Admin クライアントは必要最小限に限定

主なテーブル: `facilities`, `users`, `user_facility_roles`, `clients`, `groups`, `group_members`, `posts`, `post_reactions`, `post_bookmarks`, `post_reads`, `attachments`, `invite_codes`, `client_documents`, `push_subscriptions`

---

## 7. コーディング規約

- **`'use client'`**: フォーム / インタラクション / `useState` / `useEffect` / ブラウザ API が必要な場合のみ
- **`export const dynamic = 'force-dynamic'`**: 認証が必要な Server Component ページに付与
- **コメント・ログ**: 日本語コメント可。`console.log` には `[HomePage]` 等のプレフィックスを付ける慣習
- **本番コード**: `process.env.NODE_ENV !== 'production'` のデバッグ UI・ログを本番に漏らさないこと
- **型定義**: `types/carebridge.ts` のドメイン型を使用。スキーマ変更時は必ず型も更新する
- **状態管理**: グローバル状態ライブラリ（Redux / Zustand 等）は未導入。`useState` + props でローカル管理
- **定数**: 施設タイプ・職種・ロール等は `lib/constants.ts` を参照・追加する

---

## 8. 環境変数

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin クライアント用（**サーバー側のみ**） |
| `RESEND_API_KEY` | メール送信 |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push（公開鍵） |
| `VAPID_PRIVATE_KEY` | Web Push（秘密鍵、**サーバー側のみ**） |
| `VAPID_SUBJECT` | Web Push subject |
| `NEXT_PUBLIC_APP_URL` | アプリの公開 URL |

詳細: `ENV_SETUP_GUIDE.md`、`docs/deployment-vercel.md`

---

## 9. 主要フロー

**サインアップ〜利用開始**
1. `/signup` → メール確認 → `/setup/choose`
2. 施設作成（`/setup/create`）または招待コード参加（`/setup/join` or `/invite/[code]`）
3. → `/home`

**グループ・投稿**
- グループ一覧 → タイムライン → `PostComposer` で投稿（テキスト・添付）
- 投稿に対してリアクション・既読・しおりを管理

**プッシュ通知**
- `PushNotificationToggle` → `push/subscribe` API → `push_subscriptions` テーブルに保存
- 通知送信: `push/notify` API → `lib/server/push.ts` → Web Push（VAPID）

---

## 10. 既知の差分・注意事項

- **型と DB スキーマの差分**: `types/carebridge.ts` に実スキーマとの差分がコメントで記録されている（例: `body` vs `content`、`date_of_birth` vs `birth_date`）。スキーマ変更時は必ず確認・同期する
- **認証処理の重複**: Server Component で `setSession` → `getUser()` するパターンが複数ページに重複している。変更時は関連ページをすべて確認すること
- **Admin クライアントの広範な利用**: 現状は読み取りでも `createAdminClient()` が多用されている。RLS 関連の変更には注意

---

## 11. AI 開発ルール（Claude Code 向け）

### 変更の原則
- **最小差分**: 要求された変更のみ行う。無関係なファイルは変更しない
- **リファクタリング禁止**: 明示的に指示されない限りリファクタリングしない
- **既存アーキテクチャの尊重**: 命名規則・ファイル構造・パターンは既存に合わせる

### 変更前の確認
- ファイルは必ず検索で存在を確認してから参照する（行番号は検索後に特定する）
- 変更前に影響ファイルを特定し、複数ファイルを変更する場合は最初にリストアップする
- 仮定に基づいて変更する場合はその仮定を明示する

### Supabase・セキュリティ
- `createAdminClient()` は慎重に使用する（RLS バイパスのため）
- ロール・権限・RLS ポリシーの変更は特に注意する
- `SUPABASE_SERVICE_ROLE_KEY` / `VAPID_PRIVATE_KEY` はサーバー側のみ使用する

### コマンド実行
- **危険なコマンド（`rm -rf`、DB リセット、force push 等）は自動実行しない**
- 検証は `npm run build`、`npm run lint`、`git diff` を優先する

### zsh でのパス
- スペースや括弧を含むパスは二重引用符で囲む（例: `"/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）/"`）

### タスク完了時の報告フォーマット

```
1. 変更ファイル
   - path/to/file.ts（変更内容の一言説明）

2. 変更内容
   - 何をどう変えたか

3. 検証結果
   - ビルド / lint / 動作確認の結果

4. 未検証事項
   - 確認できなかった点・前提条件など
```
