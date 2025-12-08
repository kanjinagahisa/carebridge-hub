# 既存のSupabase設定確認ガイド

## 確認方法

### 方法1: `.env.local` ファイルを直接確認

1. **エディタ（Cursor）で確認**
   - 左側のファイル一覧で `.env.local` を探す
   - 見つからない場合: `Cmd + P` で `.env.local` と入力して開く
   - または、Finderで `.env.local` を右クリック → 「このアプリケーションで開く」→ Cursor

2. **確認すべき内容**
   - `NEXT_PUBLIC_SUPABASE_URL=` の後が `https://` で始まる実際のURLになっているか
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=` の後が `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` で始まる実際のキーになっているか
   - `SUPABASE_SERVICE_ROLE_KEY=` の後が実際のキーになっているか

**プレースホルダーの場合（設定されていない）:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**実際の値が設定されている場合:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0ODUxMjM0NSwiZXhwIjoxOTY0MDg4MzQ1fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ4NTEyMzQ1LCJleHAiOjE5NjQwODgzNDV9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 方法2: ターミナルで確認

ターミナルで以下のコマンドを実行：

```bash
cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
cat .env.local
```

または、Supabase設定のみを確認：

```bash
cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
cat .env.local | grep SUPABASE
```

---

### 方法3: Supabase Dashboardで確認

既にSupabaseプロジェクトを作成している場合：

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. **Settings → API を開く**
   - 左側メニュー → 「Settings」→ 「API」

3. **必要な情報を確認**
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（⚠️ 注意: このキーは秘匿情報です）

4. **`.env.local` と比較**
   - これらの値が `.env.local` に正しく設定されているか確認

---

## 設定されていない場合の対処法

### プレースホルダーが残っている場合

`.env.local` に以下のようなプレースホルダーが残っている場合：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**対処方法:**

1. **Supabase Dashboardから値を取得**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択
   - Settings → API を開く
   - 必要な値をコピー

2. **`.env.local` を編集**
   - プレースホルダーを実際の値に置き換える
   - 例：
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

3. **ファイルを保存**

---

## 既に設定されている場合の確認ポイント

実際の値が設定されている場合、以下の点を確認：

1. **URLの形式**
   - ✅ 正しい: `https://xxxxxxxxxxxxx.supabase.co`
   - ❌ 間違い: `your_supabase_project_url` や `http://` で始まる

2. **キーの形式**
   - ✅ 正しい: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）
   - ❌ 間違い: `your_supabase_anon_key` などの短い文字列

3. **スペースや改行**
   - 値の前後にスペースがないか確認
   - 例: `NEXT_PUBLIC_SUPABASE_URL = https://...` ❌（スペースがある）
   - 正しい: `NEXT_PUBLIC_SUPABASE_URL=https://...` ✅

---

## 現在の設定状況を確認

ターミナルで以下のコマンドを実行すると、現在の設定状況を確認できます：

```bash
cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"
echo "=== Supabase設定の確認 ==="
echo ""
echo "SUPABASE_URL:"
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | head -c 50
echo ""
echo ""
echo "ANON_KEY:"
grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d'=' -f2 | head -c 30
echo "..."
```

---

## まとめ

1. **`.env.local` ファイルを開く**（Cursorエディタで）
2. **Supabase関連の環境変数を確認**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **プレースホルダー（`your_supabase_project_url` など）が残っている場合**
   - Supabase Dashboardから実際の値を取得
   - `.env.local` を更新
4. **実際の値が設定されている場合**
   - そのまま使用して問題ありません
   - Resendの設定のみ追加してください

