# CareBridge Hub - Supabase セットアップガイド

## Step 1: Supabase プロジェクトの作成

1. https://database.new にアクセス
2. プロジェクト名: `carebridge-hub-dev`
3. パスワード: 強固なパスワードを設定
4. リージョン: Tokyo を選択

## Step 2: 環境変数の設定

プロジェクト作成後、以下を取得してください：

- **Supabase URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → Project API keys → `anon` `public`

取得した値を以下の形式で提供してください：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: SQL スキーマの実行

1. Supabase ダッシュボード → SQL Editor → New Query
2. `supabase/migrations/001_initial_schema.sql` の内容をコピー
3. SQL Editor に貼り付けて実行
4. "Success" と表示されれば完了

## Step 4: RLS ポリシーの実行

1. SQL Editor → New Query
2. `supabase/migrations/002_rls_policies.sql` の内容をコピー
3. SQL Editor に貼り付けて実行

## Step 5: ローカル環境の起動

```bash
npm install
npm run dev
```

http://localhost:3000 にアクセスしてログイン画面が表示されれば成功です。


