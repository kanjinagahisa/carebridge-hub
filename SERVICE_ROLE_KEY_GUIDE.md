# Service Role Keyの取得方法

## 手順

### ステップ1: Legacyタブに移動

1. Supabaseダッシュボードの「API Keys」ページで、**「Legacy anon, service_role API keys」タブ**をクリック

### ステップ2: service_roleキーをコピー

1. **「service_role」**セクションを探す
2. **「secret」**キー（長い文字列）をコピー
   - 通常、`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`のような形式
   - 「Reveal」ボタンをクリックして表示する必要がある場合があります

### ステップ3: .env.localファイルに設定

1. プロジェクトの`.env.local`ファイルを開く
2. `SUPABASE_SERVICE_ROLE_KEY=`の後に、コピーしたキーを貼り付け

例：
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c3ppbW1ranJremRkeXBlZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTQzMiwiZXhwIjoyMDc5MDI1NDMyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### ステップ4: 開発サーバーを再起動

環境変数を反映するため、開発サーバーを再起動してください。

## 重要事項

- **`service_role`キーは機密情報です**
- Gitにコミットしないでください（`.gitignore`に`.env.local`が含まれていることを確認）
- このキーはサーバーサイドでのみ使用してください
- クライアントサイド（ブラウザ）では絶対に使用しないでください












