# .env.localファイルにservice_roleキーを設定する方法

## 方法1: エディタで開く（推奨）

### ステップ1: Cursorで.env.localファイルを開く

1. Cursorエディタで、左側のファイルエクスプローラーを開く
2. プロジェクトのルートディレクトリ（`CareBridge Hub（ケアブリッジ・ハブ）`）を確認
3. `.env.local`ファイルを探す
   - ファイル名が表示されない場合は、`Cmd + Shift + P`（Mac）または`Ctrl + Shift + P`（Windows）を押す
   - 「File: Open」と入力してEnter
   - `.env.local`と入力してファイルを開く

### ステップ2: service_roleキーを貼り付ける

1. `.env.local`ファイルが開いたら、以下の行を探す：
   ```
   SUPABASE_SERVICE_ROLE_KEY=
   ```

2. `=`の後に、Supabaseダッシュボードからコピーした`service_role`キーを貼り付ける

   例：
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53c3ppbW1ranJremRkeXBlZ3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTQzMiwiZXhwIjoyMDc5MDI1NDMyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. ファイルを保存（`Cmd + S`（Mac）または`Ctrl + S`（Windows））

### ステップ3: 確認

ファイルの内容が以下のようになっていることを確認：
- `SUPABASE_SERVICE_ROLE_KEY=`の後に、長い文字列（JWTトークン）が設定されている
- 他の行は変更されていない

## 方法2: ターミナルコマンドで編集

ターミナルで以下のコマンドを実行：

```bash
# 1. プロジェクトディレクトリに移動
cd "/Users/kanji/Downloads/CareBridge Hub（ケアブリッジ・ハブ）"

# 2. .env.localファイルを開く（nanoエディタを使用）
nano .env.local
```

nanoエディタが開いたら：
1. 矢印キーで`SUPABASE_SERVICE_ROLE_KEY=`の行に移動
2. `=`の後にカーソルを移動
3. Supabaseダッシュボードからコピーしたキーを貼り付け（`Cmd + V`（Mac）または`Ctrl + V`（Windows））
4. `Ctrl + X`で保存して終了
5. `Y`で保存を確認
6. Enterで確定

## 注意事項

- **`service_role`キーは機密情報です**
- Gitにコミットしないでください（`.gitignore`に`.env.local`が含まれていることを確認）
- このキーはサーバーサイドでのみ使用してください
- クライアントサイド（ブラウザ）では絶対に使用しないでください












