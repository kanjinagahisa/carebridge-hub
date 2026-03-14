# CareBridge Hub リポジトリ分析レポート（CLAUDE.md 作成用）

本ドキュメントは、このリポジトリを分析し、CLAUDE.md に記載すべき内容を整理したものです。**CLAUDE.md はまだ作成していません。** 以下の「7. CLAUDE.md に書くべき項目」をベースに、実際の CLAUDE.md を執筆してください。

---

## 1. プロジェクトの目的

### アプリの概要
**CareBridge Hub** は、**介護・福祉施設向けの情報共有・連携アプリ**です。  
メタデータ（`app/layout.tsx`）では「介護・福祉向け情報共有アプリ」と定義されています。

### 対象ユーザー（推測）
- **施設スタッフ（一般職員）**: 利用者ごとの記録閲覧・投稿、グループでの情報共有
- **施設管理者（admin）**: 施設設定、スタッフ招待、グループ管理
- **複数施設に所属するユーザー**: 施設切り替え（FacilitySwitcher）で同一アカウントで複数施設を利用可能

※ **保護者（家族）** 向けの画面やロールはコード上見当たりません。現状は施設内スタッフ向けです。

### 主要機能（リスト）
- **認証・アカウント**
  - メール/パスワードでのサインアップ・ログイン
  - パスワードリセット（forgot-password / reset-password）
  - 施設未所属時は「施設を作成」または「招待コードで参加」の選択（`/setup/choose`）
- **施設**
  - 施設の新規作成（`/setup/create`）
  - 招待コードによる施設参加（`/invite/[code]`）
  - 施設切り替え（`FacilitySwitcher`）、施設設定・スタッフ管理・退会（`/settings/facility`）
- **ホーム**
  - 新着投稿まとめ、未読一覧（`/home/unread`）、しおり（`/home/bookmarks`）
  - プッシュ通知のオン/オフ（`PushNotificationToggle`）
- **グループ**
  - グループ一覧・作成（利用者グループ / 多職種グループ / コミュニティ）
  - グループごとのタイムライン・投稿・リアクション・既読・添付
- **利用者（クライアント）**
  - 利用者一覧・新規登録、利用者ごとのプロフィール・タイムライン・メモ・書類（client_documents）
  - 利用者に紐づく投稿（`client_id` 付き posts）と添付
- **その他**
  - メニュー・プロフィール（`/menu`, `/menu/profile`）
  - 通知設定（`/settings/notifications`）
  - 利用規約・プライバシー（`/terms`, `/privacy`）
  - PWA（manifest、Service Worker、sw-message-bridge）、Web Push 通知

---

## 2. 技術スタック

| 分類 | 技術 |
|------|------|
| **Framework** | Next.js 14（App Router） |
| **Language** | TypeScript 5.x |
| **Database** | Supabase（PostgreSQL） |
| **Auth** | Supabase Auth（メール/パスワード、Cookie ベースのセッション） |
| **Styling** | Tailwind CSS 3.x、globals.css（CSS variables） |
| **Hosting** | Vercel（`docs/deployment-vercel.md` を参照） |
| **メール送信** | Resend（`resend`、パスワード変更通知等） |
| **プッシュ通知** | Web Push（`web-push`、VAPID）、push_subscriptions テーブル |
| **アイコン・UI** | lucide-react |
| **日付** | date-fns |
| **その他** | ESLint（eslint-config-next）、PostCSS、Autoprefixer |

- **Supabase クライアント**: `@supabase/ssr`（サーバー/ミドルウェア用）、`@supabase/supabase-js`（admin 用）
- **画像**: Next.js Image の `remotePatterns` で `**.supabase.co` を許可
- **PWA**: `/sw.js` 用ヘッダー設定（Cache-Control 等）を `next.config.js` で指定

---

## 3. プロジェクト構造

### ルート直下
- `app/` … Next.js App Router のページ・レイアウト
- `components/` … UI コンポーネント
- `lib/` … Supabase クライアント、API ヘルパー、ユーティリティ、定数
- `types/` … 共通型定義（`carebridge.ts`）
- `supabase/` … マイグレーション（`migrations/`）、SQL（`sql/`）
- `docs/` … デプロイ・検証・トラブルシュート用ドキュメント
- 各種 `*_GUIDE.md` / `*_GUIDE.md` … 運用・設定ガイド

### app ディレクトリの役割（App Router）
- **`layout.tsx`** … ルートレイアウト（メタデータ、viewport、PWA、`SwMessageBridge`、globals.css）
- **`page.tsx`** … ルートは `/home` へ redirect
- **認証まわり**: `login`, `signup`, `auth/forgot-password`, `auth/reset-password`
- **セットアップ**: `setup/choose`, `setup/create`, `setup/join`、招待 `invite/[code]`
- **メイン利用**: `home/`（レイアウト + TabBar）, `groups/`, `clients/`, `connections/`, `menu/`
- **設定**: `settings/notifications`, `settings/facility`, `settings/facility/invite`
- **API**: `app/api/` 配下に Route Handler（`route.ts`）
- **その他**: `terms`, `privacy`, `not-found`、Service Worker 用 `sw-message-bridge.tsx` / `SwMessageBridge.tsx`

### components
- **共通**: `Header`, `TabBar`, `Logo`, `LogoutButton`, `ConfirmDialog`, `ClientOnlyDate`, `PushNotificationToggle`, `TimelineClient`
- **home**: `NewPostSummaryCard`
- **groups**: `GroupList`, `GroupListItem`, `GroupTimeline`, `PostCard`, `PostComposer`
- **client**: `ClientHeader`, `ClientTimeline`, `ClientMemoCard`, `ClientPostComposer`, `ClientBasicInfoCard`, `ClientDocumentsCard`
- **settings**: `FacilitySettingsMenu`, `FacilityBasicInfoCard`, `FacilityLeaveCard`, `StaffManagementCard`
- **menu**: `FacilitySwitcher`
- **common**: `EditableTextArea`, `ConfirmDialog`

### lib
- **supabase**: `client.ts`（ブラウザ）, `server.ts`（Server Component/Server Action）, `middleware.ts`（セッション更新）, `admin.ts`（service_role）, `api.ts`（API Route 用に Request から Cookie を渡すクライアント）
- **utils**: `auth.ts`, `auth-server.ts`, `client.ts`, `email.ts`, `notifications.ts`, `utils.ts`
- **api**: `clients.ts`, `clients-server.ts`
- **server**: `push.ts`（Web Push 送信）
- **webpush**: `vapid.ts`
- **constants.ts**: 施設タイプ・職種・ロール・グループタイプ・投稿サイド・リアクション・ファイルタイプの定数
- **validators.ts**: バリデーション

### types
- **`types/carebridge.ts`**: `Client`, `ClientDocument`, `Group`, `Post`, `PostReaction`, `PostRead`, `Attachment` 等のドメイン型。コメントで「要求仕様と実スキーマの差分」を記載（例: `body` vs `content`, `date_of_birth` vs `birth_date`）。

### Next.js App Router 構造のポイント
- **ルート**: `/` → `/home` にリダイレクト
- **レイアウトの入れ子**: `app/layout.tsx` → `app/home/layout.tsx`（TabBar 表示）など、機能ごとに layout でラップ
- **動的ルート**: `app/clients/[id]/`, `app/groups/[id]/`, `app/invite/[code]/`
- **動的レンダリング**: 認証が必要なページでは `export const dynamic = 'force-dynamic'` を指定
- **Server Component がデフォルト**: 一覧・詳細の「ページ」は Server Component でデータ取得し、インタラクティブな部分だけ Client Component（`'use client'`）に切り出している

---

## 4. コーディングパターン

### Server Components / Client Components
- **Server Component（デフォルト）**: `app/home/page.tsx`, `app/clients/page.tsx`, `app/groups/page.tsx`, `app/setup/choose/page.tsx`, `app/clients/[id]/timeline/page.tsx` など。認証・施設取得・一覧データ取得を行い、必要に応じて Client に props で渡す。
- **Client Component（`'use client'`）**: フォーム・モーダル・リアルタイム操作が必要な画面。例: `app/login/page.tsx`, `app/signup/page.tsx`, `app/invite/[code]/page.tsx`, `app/setup/create/page.tsx`, `app/setup/join/page.tsx`, `app/clients/ClientsListClient.tsx`, `GroupList`, `PostComposer`, `ClientTimeline`, `PushNotificationToggle`, `FacilitySwitcher`, `TabBar`, `ConfirmDialog`, `EditableTextArea` など。
- **認証付きページ**: Server で `createClient()` または Cookie から `setSession` を試みた上で `getUser()` し、未認証なら `redirect('/login')` または施設未所属なら `redirect('/setup/choose')`。

### API Route（app/api）
- **認証**: `auth/check-existing-user`, `auth/password-changed-notify`
- **施設・ロール**: `facilities/create`, `facility/leave`, `user-facility-roles/upsert`, `users/set-current-facility`, `users/upsert-profile`
- **グループ**: `groups/invite-candidates`, `groups/add-owner`
- **プッシュ**: `push/subscribe`, `push/notify`
- **その他**: `sw-log`（Service Worker ログ）, `debug-env`（デバッグ用）
- API では `createApiClient(request)`（`lib/supabase/api.ts`）で Cookie からセッションを復元し、必要に応じて `createAdminClient()` で RLS をバイパス。

### Supabase の使い方
- **ブラウザ**: `createClient()`（`lib/supabase/client.ts`）→ ログイン・招待承認・Client 側のデータ取得
- **Server Component / Server Action**: `createClient()`（`lib/supabase/server.ts`）→ Cookie ベースのセッション。多くのページで「Cookie に JSON で入った auth-token を手動で `setSession` してから `getUser()`」するパターンが繰り返されている。
- **ミドルウェア**: `lib/supabase/middleware.ts` の `updateSession` でセッション更新・未認証時は `/login`、施設未所属時は `/setup/choose` にリダイレクト。施設チェックは `createAdminClient()` で `user_facility_roles` を参照。
- **RLS をバイパスしたいとき**: `createAdminClient()`（`lib/supabase/admin.ts`、`SUPABASE_SERVICE_ROLE_KEY`）をサーバー側でのみ使用。一覧・集計などで広く使われている。

### 状態管理
- **グローバル状態管理ライブラリは未使用**（Redux / Zustand / Jotai 等なし）
- サーバーで取ったデータを Client に `initialClients` のように props で渡し、Client 内は `useState` / `useEffect` でローカル状態。
- 施設の「現在選択中」は `users.current_facility_id` と API `users/set-current-facility` で管理し、`FacilitySwitcher` で切り替え。

---

## 5. Supabase 構成

### Auth
- **利用している**: Supabase Auth（メール/パスワード）
- サインアップ・ログイン・パスワードリセット・メール確認フローを想定。Cookie は `@supabase/ssr` で管理（`sb-*-auth-token` 等）。ミドルウェアと各ページで Cookie から `setSession` して `getUser()` する処理が重複して存在。

### Database
- **利用している**: PostgreSQL（Supabase）
- **主なテーブル**: `facilities`, `users`（auth.users を拡張）, `user_facility_roles`, `clients`, `groups`, `group_members`, `posts`, `post_reactions`, `post_bookmarks`, `post_reads`, `attachments`, `invite_codes`, `client_documents`, `push_subscriptions`
- **RLS**: 全テーブルで RLS を有効化。多数のマイグレーション（002〜069 付近）でポリシー調整・デバッグが行われている。実装の多くはサーバー側で `createAdminClient()` により RLS をバイパスしており、クライアントからの直アクセスは一部（招待コード取得、プッシュ購読など）に限られる。

### Storage
- **利用している**: Storage バケット `attachments`
- 投稿添付ファイル用。パスは `{client_id|group_id}/{filename}` を想定。RLS は「自施設の clients/groups に紐づくパスのみ」という形で SELECT/INSERT/DELETE ポリシーが設定されている（`get_user_facility_ids` 等を利用）。`client_documents` 用のバケットが別にあるかは要確認。

### Edge Functions
- **未使用**: `supabase/functions` は存在しない。メール送信は Resend を Next.js API から、Web Push は `lib/server/push.ts` と API Route `push/notify` から呼び出している。

---

## 6. 改善提案

1. **認証・セッション処理の共通化**  
   各 Server Component で「Cookie を読んで `setSession` → `getUser()`」が繰り返されている。`lib/utils/auth-server.ts` や専用ヘルパーに「現在ユーザーを取得する」関数を集約し、ページではそれを呼ぶだけにすると保守しやすい。

2. **Admin クライアントの使用範囲の見直し**  
   RLS をバイパスする `createAdminClient()` が多くの読み取りで使われている。セキュリティと将来の権限細分化のため、できる箇所は「認証済み Supabase クライアント + RLS」に寄せ、admin は「どうしても必要な操作」に限定することを検討できる。

3. **Client Component の境界の明確化**  
   「ページ全体が Client」のページ（login, signup, invite 等）はそのままでよいが、一覧・詳細では「データ取得は Server、インタラクションだけ Client」を徹底すると、パフォーマンスと一貫性が取りやすい。`ClientsListClient` のように「一覧用の Client ラッパー」パターンを他一覧でも揃えるとよい。

4. **型とスキーマの一致**  
   `types/carebridge.ts` に「将来拡張用」のフィールドが多く、実スキーマとコメントで対応関係が書かれている。スキーマ変更時に型を必ず更新する運用、または DB 型生成（Supabase CLI の型 export 等）の導入を検討できる。

5. **デバッグ用コードの整理**  
   `process.env.NODE_ENV !== 'production'` の `console.log` や、開発用の UI 表示が散在している。本番ビルドに影響しないようにまとめるか、ロガーに置き換えると読みやすくなる。

6. **API Route のエラーハンドリングとレスポンス形式**  
   API の戻り形式（成功時・エラー時の JSON 形状）を統一し、クライアント側のハンドリングを簡潔にできる。

7. **テスト**  
   単体テスト・E2E の仕組みが現状なさそうなため、重要なフロー（認証、招待、投稿作成）からテストを追加すると安心。

---

## 7. CLAUDE.md に書くべき項目（項目のみ整理）

以下を CLAUDE.md の章立て・項目として推奨します。**ここでは項目の列挙のみ行い、CLAUDE.md の本文はまだ作成していません。**

1. **プロジェクト概要**
   - アプリ名と一行説明（介護・福祉向け情報共有アプリ）
   - 対象ユーザー（施設スタッフ・管理者、複数施設対応）

2. **技術スタック**
   - Framework: Next.js 14 (App Router)
   - Language: TypeScript
   - Database / Auth: Supabase
   - Styling: Tailwind CSS
   - Hosting: Vercel
   - 主要ライブラリ: Resend, web-push, date-fns, lucide-react

3. **ディレクトリ構造**
   - `app/`: ルート・認証・セットアップ・home・groups・clients・settings・api の役割
   - `components/`: 機能別（home, groups, client, settings, menu, common）の役割
   - `lib/`: supabase, utils, api, server, constants, validators の役割
   - `types/`: carebridge 型とスキーマとの対応方針
   - `supabase/migrations`: スキーマ・RLS の変更履歴

4. **認証・セッション**
   - Supabase Auth（Cookie）の流れ
   - ミドルウェアでの未認証・施設未所属リダイレクト
   - Server での `createClient()` / Cookie からの `setSession` の扱い
   - Admin クライアント（service_role）の使用場面と注意点

5. **データ取得パターン**
   - Server Component でデータ取得 → Client に props で渡す
   - 一覧は Server、フォーム・モーダルは Client
   - API Route では `createApiClient(request)` または `createAdminClient()` の使い分け

6. **Supabase 利用方針**
   - Auth / Database / Storage の使用有無
   - Edge Functions は未使用であること
   - RLS と admin クライアントの使い分けの考え方

7. **コーディング規約**
   - `'use client'` を付ける条件（フォーム・状態・ブラウザ API）
   - `export const dynamic = 'force-dynamic'` を付けるページ
   - 日本語コメント・ログプレフィックス（`[HomePage]` 等）の慣習

8. **環境変数**
   - 一覧と役割（NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY, RESEND_*, VAPID_* 等）
   - 参照ドキュメント（ENV_SETUP_GUIDE.md, docs/deployment-vercel.md 等）

9. **主要フロー**
   - サインアップ → 施設作成 or 招待参加 → ホーム
   - グループ・利用者・投稿・添付・既読・リアクションの流れ
   - プッシュ通知の購読と送信（push_subscriptions, push/notify）

10. **注意事項・既知の差分**
    - 型定義（types/carebridge.ts）と実 DB スキーマの差分の扱い
    - 本番ではデバッグ用 console や開発用 UI を出さないこと

---

以上で、CLAUDE.md を作成するための情報の整理を終えています。実際の CLAUDE.md は、上記「7. CLAUDE.md に書くべき項目」をベースに、必要に応じて簡潔な説明を足して作成してください。
