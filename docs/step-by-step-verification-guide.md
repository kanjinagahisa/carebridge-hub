# 手取り足取りガイダンス - 3つの確認項目

このドキュメントでは、以下の3つの項目について、一つずつ詳細な手順を説明します。

1. データベースのマイグレーションを実行
2. VercelのRuntime Logsを確認
3. 環境変数の一致確認

---

## 1. データベースのマイグレーションを実行

### 目的
データベースに必要なテーブル、ポリシー、関数などを作成します。これが未実行の場合、アプリケーションが正常に動作しません。

### 前提条件
- Supabase Dashboard にアクセスできること
- 本番プロジェクト（`carebridge-hub-prod`）にアクセスできること

### 手順

#### ステップ 1: Supabase Dashboard にアクセス

1. ブラウザで https://supabase.com にアクセス
2. ログイン（必要に応じて）
3. プロジェクト一覧から **`carebridge-hub-prod`** を選択

#### ステップ 2: SQL Editor を開く

1. 左メニューから **"SQL Editor"** をクリック
   - 場所: 左メニューの上部（Database セクション内）
2. **"New query"** ボタンをクリック
   - 画面右上または中央に表示されるボタン

#### ステップ 3: マイグレーションファイルを確認

プロジェクト内の `supabase/migrations/` フォルダには、以下の64個のマイグレーションファイルがあります：

```
001_initial_schema.sql
002_rls_policies.sql
003_invite_codes.sql
004_facility_setup_policies.sql
005_fix_facility_insert_policy.sql
... (以下、064_fix_post_reactions_select_rls.sql まで)
```

**重要**: ファイル名の数字順（001, 002, 003...）に従って、順番に実行してください。

#### ステップ 4: 最初のマイグレーションファイルを実行

1. プロジェクトの `supabase/migrations/001_initial_schema.sql` ファイルを開く
   - ローカルのファイルエクスプローラーで開く
   - または、エディタ（VS Code、Cursor など）で開く
2. ファイルの内容をすべてコピー（Ctrl+A → Ctrl+C または Cmd+A → Cmd+C）
3. Supabase の SQL Editor に貼り付け（Ctrl+V または Cmd+V）
4. **"Run"** ボタンをクリック（または Ctrl+Enter）
5. 実行結果を確認：
   - ✅ **"Success"** と表示されれば成功
   - ❌ エラーメッセージが表示された場合は、内容を確認して対応

#### ステップ 5: 残りのマイグレーションファイルを順番に実行

1. **"New query"** ボタンをクリック（新しいクエリタブを開く）
2. 次のマイグレーションファイル（`002_rls_policies.sql`）を開く
3. 内容をコピーして SQL Editor に貼り付け
4. **"Run"** をクリック
5. 成功を確認
6. この手順を `064_fix_post_reactions_select_rls.sql` まで繰り返す

**注意**: 
- 各マイグレーションの実行後、必ず **"Success"** と表示されることを確認してください
- エラーが発生した場合は、エラーメッセージを記録し、次のマイグレーションに進む前に解決してください
- マイグレーションの実行には時間がかかる場合があります（特に大きなファイル）

#### ステップ 6: マイグレーションの確認

1. 左メニューから **"Database"** → **"Migrations"** をクリック
2. マイグレーション履歴が表示されることを確認
   - "Run your first migration" というメッセージが表示されていれば、まだマイグレーションが未実行です
   - マイグレーション履歴が表示されれば、正常に実行されています

#### ステップ 7: テーブルの確認

1. 左メニューから **"Database"** → **"Tables"** をクリック
2. 以下のテーブルが存在することを確認：
   - `facilities`
   - `users`
   - `user_facility_roles`
   - `clients`
   - `groups`
   - `posts`
   - `comments`
   - `client_documents`
   - `client_memos`
   - その他、マイグレーションファイルで定義されているテーブル

**確認方法**:
- テーブル一覧に表示されていれば存在します
- "No tables created yet" と表示されていれば、マイグレーションが未実行です

---

## 2. VercelのRuntime Logsを確認

### 目的
ミドルウェアが正常に動作しているか、セッション検証が正しく行われているかを確認します。

### 前提条件
- Vercel Dashboard にアクセスできること
- CareBridge Hub のプロジェクトにアクセスできること

### 手順

#### ステップ 1: Vercel Dashboard にアクセス

1. ブラウザで https://vercel.com にアクセス
2. ログイン（必要に応じて）
3. プロジェクト一覧から **"carebridge-hub"** を選択

#### ステップ 2: Logs ページを開く

1. 左メニューから **"Logs"** をクリック
   - 場所: 左メニューの上部（Overview, Deployments の下）
2. ログ画面が表示されます

#### ステップ 3: Runtime タブを選択

1. ログ画面の上部にタブが表示されます：
   - **"Build"** タブ（ビルド時のログ）
   - **"Runtime"** タブ（実行時のログ）← **これを選択**
2. **"Runtime"** タブをクリック

**重要**: ミドルウェアのログは **Runtime Logs** に表示されます。Build Logs ではありません。

#### ステップ 4: フィルタを設定

1. ログ画面の上部に **"Filter"** または **"Search"** ボックスがあります
2. ボックスに `[Middleware]` と入力
3. Enter キーを押す（または検索ボタンをクリック）

**注意**: この時点では、まだログが表示されない可能性があります。次のステップでページにアクセスすると、ログが表示されます。

#### ステップ 5: 別タブでアプリケーションにアクセス

1. **新しいブラウザタブ** を開く（Ctrl+T または Cmd+T）
2. アドレスバーに `https://carebridge-hub.vercel.app/login` と入力
3. Enter キーを押してアクセス
4. ページが読み込まれるまで待つ

**重要**: 
- ログは、実際にリクエストが発生した時にのみ表示されます
- ログ画面を開いただけでは表示されません
- ページにアクセスすることで、ミドルウェアが実行され、ログが出力されます

#### ステップ 6: ログを確認

1. Vercel のログ画面のタブに戻る
2. ログが自動更新されるのを待つ（数秒かかる場合があります）
3. 以下のようなログが表示されるはずです：

```
[Middleware] ========================================
[Middleware] Request path: /login
[Middleware] Auth cookies found: 0
[Middleware] No user found (not authenticated)
[Middleware] ========================================
```

**期待されるログの内容**:
- `[Middleware] Request path: /login` - リクエストされたパス
- `[Middleware] Auth cookies found: 0` - 認証クッキーの数（未認証の場合は 0）
- `[Middleware] No user found (not authenticated)` - 認証されていないユーザー
- または `[Middleware] User authenticated: [user_id] [email]` - 認証されているユーザー

#### ステップ 7: ログが表示されない場合の対処

ログが表示されない場合、以下を確認してください：

1. **Runtime タブが選択されているか確認**
   - Build タブではなく、Runtime タブを選択してください

2. **フィルタをクリアして再試行**
   - フィルタボックスをクリア
   - 再度 `[Middleware]` と入力

3. **ページを再読み込み**
   - 別タブで `https://carebridge-hub.vercel.app/login` を再読み込み（F5 または Ctrl+R）

4. **ログ画面を更新**
   - Vercel のログ画面を更新（F5 または Ctrl+R）

5. **時間を置いて再試行**
   - ログの表示には数秒かかる場合があります

---

## 3. 環境変数の一致確認

### 目的
Vercel の環境変数と Supabase の API Keys が一致していることを確認します。不一致があると、認証が正常に動作しません。

### 前提条件
- Vercel Dashboard にアクセスできること
- Supabase Dashboard にアクセスできること

### 手順

#### ステップ 1: Vercel の環境変数を確認

1. Vercel Dashboard にアクセス
2. CareBridge Hub のプロジェクトを選択
3. 左メニューから **"Settings"** をクリック
4. 左メニューから **"Environment Variables"** をクリック
5. 以下の3つの環境変数が表示されることを確認：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### ステップ 2: Vercel の環境変数の値を表示

1. 各環境変数の右側に **目のアイコン**（👁️）があります
2. 目のアイコンをクリックすると、値が表示されます
3. 以下の値をコピーして、メモ帳やテキストエディタに保存してください：
   - `NEXT_PUBLIC_SUPABASE_URL` の値
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` の値
   - `SUPABASE_SERVICE_ROLE_KEY` の値

**注意**: 
- 値は長い文字列です。コピーする際に、先頭や末尾の空白文字が含まれていないか確認してください
- セキュリティ上、値はデフォルトで非表示になっています。目のアイコンをクリックすると表示されます

#### ステップ 3: Supabase の Project URL を確認

1. Supabase Dashboard にアクセス
2. 本番プロジェクト（`carebridge-hub-prod`）を選択
3. 左メニューから **"Settings"** をクリック
4. 左メニューから **"API"** をクリック
5. **"Project URL"** セクションを確認
6. URL の値をコピーして、メモ帳やテキストエディタに保存してください
   - 例: `https://wqtnffvhhssgdnecjwpy.supabase.co`

#### ステップ 4: Supabase の API Keys を確認

1. Supabase Dashboard で、左メニューから **"Settings"** → **"API Keys"** をクリック
2. ページ上部に2つのタブが表示されます：
   - **"Publishable and secret API keys"** タブ
   - **"Legacy anon, service_role API keys"** タブ ← **これを選択**
3. **"Legacy anon, service_role API keys"** タブをクリック
4. 以下のキーが表示されます：
   - **anon** `public`: これが `NEXT_PUBLIC_SUPABASE_ANON_KEY` に対応
   - **service_role** `secret`: これが `SUPABASE_SERVICE_ROLE_KEY` に対応
5. 各キーの右側に **コピーアイコン**（📋）があります
6. 各キーをコピーして、メモ帳やテキストエディタに保存してください

**注意**: 
- "Publishable and secret API keys" タブではなく、**"Legacy anon, service_role API keys"** タブを確認してください
- キーの値は長い文字列です。コピーする際に、先頭や末尾の空白文字が含まれていないか確認してください

#### ステップ 5: 環境変数の一致を確認

以下の3つの値が完全に一致していることを確認してください：

| Vercel 環境変数 | Supabase 設定 | 一致しているか |
|----------------|--------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | ✅ / ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys → Legacy → anon `public` | ✅ / ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → Legacy → service_role `secret` | ✅ / ❌ |

**確認方法**:
1. メモ帳やテキストエディタに保存した値を比較
2. 文字列が完全に一致しているか確認（大文字・小文字、空白文字も含む）
3. 不一致がある場合は、チェックリストに ❌ を記入

#### ステップ 6: 不一致がある場合の対応

環境変数が不一致の場合、以下の手順で修正してください：

1. Vercel Dashboard に戻る
2. **"Settings"** → **"Environment Variables"** を開く
3. 不一致の環境変数の右側の **編集アイコン**（✏️）をクリック
4. 正しい値を入力（Supabase からコピーした値）
5. **"Save"** をクリック
6. **重要**: 環境変数を変更した後、新しいデプロイメントを実行する必要があります

#### ステップ 7: 新しいデプロイメントを実行

環境変数を変更した後、以下のいずれかの方法で新しいデプロイメントを実行してください：

**方法 1: 手動で再デプロイ**
1. Vercel Dashboard で **"Deployments"** をクリック
2. 最新のデプロイメントの右側の **"..."** メニューをクリック
3. **"Redeploy"** を選択
4. 確認ダイアログで **"Redeploy"** をクリック

**方法 2: Git にコミットして自動デプロイ**
1. ローカルで何か小さな変更をコミット（例: コメントの追加）
2. Git にプッシュ
3. Vercel が自動的にデプロイを開始します

**注意**: 環境変数を変更しただけでは、既存のデプロイメントには反映されません。新しいデプロイメントを実行する必要があります。

---

## 確認チェックリスト

以下の項目を確認し、チェックを入れてください：

### 1. データベースのマイグレーション
- [ ] すべてのマイグレーションファイル（001〜064）を順番に実行
- [ ] 各マイグレーションの実行後、**"Success"** と表示されることを確認
- [ ] Database → Migrations でマイグレーション履歴が表示される
- [ ] Database → Tables で必要なテーブルが存在する

### 2. VercelのRuntime Logs
- [ ] Logs → Runtime タブを選択
- [ ] フィルタに `[Middleware]` と入力
- [ ] 別タブで `https://carebridge-hub.vercel.app/login` にアクセス
- [ ] ログ画面で `[Middleware]` のログが表示される

### 3. 環境変数の一致確認
- [ ] Vercel の `NEXT_PUBLIC_SUPABASE_URL` = Supabase の Project URL
- [ ] Vercel の `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase の anon `public` キー
- [ ] Vercel の `SUPABASE_SERVICE_ROLE_KEY` = Supabase の service_role `secret` キー
- [ ] 不一致がある場合、Vercel の環境変数を更新
- [ ] 環境変数を更新した後、新しいデプロイメントを実行

---

## 次のステップ

上記の3つの確認項目をすべて完了したら：

1. 再度、ログイン画面で無限ループが発生するか確認
2. VercelのRuntime Logsでミドルウェアのログを確認
3. ログの内容を確認し、問題の原因を特定
4. 必要に応じて、追加の修正を実施

---

## トラブルシューティング

### マイグレーションの実行中にエラーが発生した場合

1. エラーメッセージを確認
2. エラーの内容を記録
3. 次のマイグレーションに進む前に、エラーを解決
4. 解決できない場合は、エラーメッセージを保存してサポートに問い合わせ

### ログが表示されない場合

1. Runtime タブが選択されているか確認
2. フィルタをクリアして再試行
3. ページを再読み込み
4. 時間を置いて再試行

### 環境変数が一致しない場合

1. 値のコピー&ペースト時に、先頭・末尾の空白文字が含まれていないか確認
2. 値が完全に一致しているか、文字列比較ツールを使用して確認
3. Vercel の環境変数を更新後、必ず新しいデプロイメントを実行










