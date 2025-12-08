# Supabase環境変数設定ガイド（詳細手順）

## 概要

このガイドでは、Supabase Dashboardから設定値を取得して、`.env.local` ファイルに設定する手順を詳しく説明します。

---

## ステップ1: Supabase Dashboardにアクセス

1. **ブラウザでSupabaseにアクセス**
   - https://supabase.com/dashboard を開く
   - または https://app.supabase.com を開く

2. **ログイン**
   - Googleアカウントやメールアドレスでログイン

3. **プロジェクトを選択**
   - 既にプロジェクトがある場合: プロジェクト一覧から選択
   - プロジェクトがない場合: 「New Project」をクリックして作成
     - プロジェクト名: `carebridge-hub-dev`（任意）
     - データベースパスワード: 強固なパスワードを設定
     - リージョン: `Tokyo (ap-northeast-1)` を選択
     - 「Create new project」をクリック
     - プロジェクトの作成完了まで数分待つ

---

## ステップ2: API設定画面を開く

1. **左側のメニューから「Settings」をクリック**
   - 歯車アイコン（⚙️）の「Settings」をクリック

2. **「API」を選択**
   - Settings メニューが開く
   - 左側のサブメニューから「API」をクリック
   - または、「Project Settings」→「API」を選択

3. **API設定画面が表示されることを確認**
   - 「Project URL」セクションが表示される
   - 「Project API keys」セクションが表示される

---

## ステップ3: Project URLを取得

1. **「Project URL」セクションを探す**
   - 画面の上部に表示されています

2. **URLをコピー**
   - 「Project URL」の下に表示されているURLをコピー
   - 例: `https://xxxxxxxxxxxxx.supabase.co`
   - コピーボタン（📋）をクリックするか、URLを選択して `Cmd + C` でコピー

3. **一時的にメモ帳などに保存**
   - 例: `https://abcdefghijklmnop.supabase.co`

---

## ステップ4: Anon Key（公開キー）を取得

1. **「Project API keys」セクションを探す**
   - 「Project URL」の下に表示されています

2. **「anon」と「public」を探す**
   - 「Project API keys」の下に複数のキーが表示されます
   - その中から「anon」と表示されている行を探す
   - 「public」というラベルも表示されています

3. **「anon」「public」のキーをコピー**
   - キーの右側にある「📋」アイコンをクリック
   - または、キーを選択して `Cmd + C` でコピー
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODUxMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **重要**: このキーは長い文字列です（約200文字以上）

4. **一時的にメモ帳などに保存**

---

## ステップ5: Service Role Key（サービスロールキー）を取得

1. **「service_role」を探す**
   - 「Project API keys」セクションの下に表示されています
   - 「anon」の下に「service_role」という行があります

2. **「service_role」「secret」のキーをコピー**
   - キーの右側にある「📋」アイコンをクリック
   - または、「Reveal」ボタンをクリックしてからキーをコピー
   - **重要**: このキーは機密情報です。他人に共有しないでください
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ4NTEyMzQ1LCJleHAiOjE5NjQwODgzNDV9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **一時的にメモ帳などに保存**

---

## ステップ6: `.env.local` ファイルを編集

### 方法A: Cursorエディタで編集（推奨）

1. **Cursorエディタで `.env.local` を開く**
   - `Cmd + P` を押す
   - `.env.local` と入力して Enter
   - または、左側のファイル一覧から探す

2. **既存のプレースホルダーを実際の値に置き換える**

   **変更前:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   **変更後（実際の値に置き換える）:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODUxMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ4NTEyMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **注意:**
   - `=` の後ろにスペースを入れないでください
   - キーの値の前後にスペースや改行を入れないでください
   - 引用符（`"` や `'`）は不要です

3. **ファイルを保存**
   - `Cmd + S` で保存

---

### 方法B: ターミナルで編集

1. **ターミナルで `.env.local` を開く**
   ```bash
   cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
   nano .env.local
   ```
   - または `vi .env.local` でも可

2. **編集**
   - プレースホルダーを実際の値に置き換える
   - `nano` の場合: カーソルを動かして編集

3. **保存して終了**
   - `nano` の場合: `Ctrl + O` で保存 → `Enter` → `Ctrl + X` で終了

---

## ステップ7: 設定の確認

1. **ターミナルで確認**
   ```bash
   cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
   cat .env.local | grep SUPABASE
   ```

2. **確認ポイント**
   - ✅ `NEXT_PUBLIC_SUPABASE_URL` が `https://` で始まる
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` が `eyJ` で始まる（長い文字列）
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` が `eyJ` で始まる（長い文字列）
   - ✅ `=` の後ろにスペースがない
   - ✅ プレースホルダー（`your_supabase_project_url` など）が残っていない

---

## ステップ8: 開発サーバーを再起動

環境変数を変更したので、開発サーバーを再起動する必要があります。

1. **開発サーバーを停止**
   - ターミナルで `Ctrl + C` を押す

2. **開発サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **動作確認**
   - ブラウザで `http://localhost:3000` にアクセス
   - ログイン画面が表示されれば成功

---

## トラブルシューティング

### エラー: "Invalid API key"

- キーが正しくコピーされていない可能性があります
- `.env.local` ファイルを確認し、キーの前後にスペースがないか確認

### エラー: "Failed to fetch"

- `NEXT_PUBLIC_SUPABASE_URL` が正しいか確認
- URLが `https://` で始まっているか確認

### エラー: "Missing environment variable"

- 環境変数名が正しいか確認（大文字・小文字も含む）
- `.env.local` ファイルがプロジェクトルートにあるか確認

---

## 設定例（完成形）

`.env.local` ファイルの完成形の例：

```env
# .env.local ファイルを作成しました

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODUxMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ4NTEyMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# メール送信設定（Resend）
RESEND_API_KEY=re_5mdGQgoq_UCAiD59uouBLigw377vLA2mQ
RESEND_FROM_EMAIL=CareBridge Hub <onboarding@resend.dev>
```

---

## セキュリティについて

- ⚠️ **`.env.local` ファイルはGitにコミットしないでください**
- ⚠️ **特に `SUPABASE_SERVICE_ROLE_KEY` は機密情報です**
- ⚠️ **これらのキーを他人と共有しないでください**

`.gitignore` ファイルに `.env.local` が含まれていることを確認してください（既に設定済みです）。

