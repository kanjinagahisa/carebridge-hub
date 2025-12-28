# 🚀 SQL実行クイックスタートガイド

## ⚠️ エラーが発生した場合

もし `syntax error at or near "#"` というエラーが出た場合：

- ❌ **間違い**: `docs/NEXT_STEPS_GUIDE.md` の内容をコピーして実行
- ✅ **正しい**: `docs/diagnosis-production-local-mix.sql` の内容をコピーして実行

## 📝 正しい実行手順

### ステップ1: SQLファイルを開く

1. プロジェクト内の `docs/diagnosis-production-local-mix.sql` ファイルを開く
2. このファイルには実行可能なSQLクエリが含まれています

### ステップ2: 本番プロジェクトで実行

1. Supabase ダッシュボードにログイン
2. `carebridge-hub-prod` プロジェクトを選択
3. 左メニュー → 「SQL Editor」を開く
4. 「New Query」をクリック
5. **`docs/diagnosis-production-local-mix.sql` の内容をコピー**
6. SQL Editorに貼り付けて実行
7. 結果をコピーして保存

### ステップ3: 開発プロジェクトで実行

1. Supabase ダッシュボードで `carebridge-hub-dev` プロジェクトを選択
2. 左メニュー → 「SQL Editor」を開く
3. 「New Query」をクリック
4. **同じ `docs/diagnosis-production-local-mix.sql` の内容をコピー**
5. SQL Editorに貼り付けて実行
6. 結果をコピーして保存

### ステップ4: 結果の記録

1. `docs/schema-diff-recording-template.md` を開く
2. 本番プロジェクトと開発プロジェクトの結果を記録
3. 差分を確認

## ✅ 確認すべきポイント

以下のクエリが `docs/diagnosis-production-local-mix.sql` に含まれています：

1. ✅ `posts` テーブルのカラム構造（`client_id` の有無）
2. ✅ `posts.group_id` が nullable か
3. ✅ `posts_group_or_client_check` 制約の存在
4. ✅ `client_documents` テーブルの存在と構造

## 📋 よくある質問

### Q: 本番プロジェクトと開発プロジェクト両方で実行する必要がありますか？

**A: はい、両方で実行する必要があります。**

スキーマの差分を確認するため、以下の2つのプロジェクトで同じSQLクエリを実行してください：

- **本番プロジェクト**: `carebridge-hub-prod` (wqtnffvhhssgdnecjwpy)
- **開発プロジェクト**: `carebridge-hub-dev` (nwszimmkjrkzddypegzy)

### Q: どのファイルを実行すればいいですか？

**A: `docs/diagnosis-production-local-mix.sql` を実行してください。**

このファイルには実行可能なSQLクエリが含まれています。

### Q: エラーが出ました。どうすればいいですか？

**A: エラーの内容を確認してください。**

- `syntax error at or near "#"` → 間違ったファイルをコピーしています。`docs/diagnosis-production-local-mix.sql` を確認してください
- その他のエラー → SQLクエリの内容を確認してください

## 📚 参考ドキュメント

- [診断用SQL](./diagnosis-production-local-mix.sql) - 実行するSQLファイル
- [次のステップ実行ガイド](./NEXT_STEPS_GUIDE.md) - 詳細な手順書
- [スキーマ差分記録テンプレート](./schema-diff-recording-template.md) - 結果記録用テンプレート







