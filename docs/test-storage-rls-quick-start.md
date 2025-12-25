# Storage RLSポリシー動作確認 - クイックスタートガイド

## 📋 準備（5分）

### 0. データベースの状態を確認

まず、データベースにデータが存在するか確認します。

Supabase SQL Editorで `docs/check-database-data.sql` の内容を実行してください。

**結果が「No rows returned」の場合**:
- クライアントデータが存在しないため、テスト用のクライアントを作成する必要があります
- 次の「1-1. テスト用クライアントを作成」に進んでください

**結果にデータが表示された場合**:
- 次の「1-2. 既存のクライアントIDを取得」に進んでください

### 1-1. テスト用クライアントを作成（データがない場合）

Supabase SQL Editorで `docs/create-test-client.sql` の内容を実行してください。

**手順**:
1. まず、ステップ1のクエリを実行して施設IDを取得
2. 取得した `facility_id` をコピー
3. ステップ2のクエリで `YOUR_FACILITY_ID_HERE` を置き換えて実行
4. 返された `id`（クライアントID）をメモしてください

### 1-2. 既存のクライアントIDを取得（データがある場合）

Supabase SQL Editorで以下を実行：

```sql
SELECT id, name, facility_id 
FROM clients 
WHERE deleted = FALSE 
ORDER BY created_at 
LIMIT 1;
```

**取得した`id`をメモしてください**（例: `d34da20a-5f18-4695-ab5b-396f1f81d4a0`）

**注意**: 結果が「No rows returned」の場合は、上記の「1-1. テスト用クライアントを作成」を実行してください。

### 2. 別の施設のクライアントIDを取得（オプション）

**注意**: このテストは、複数の施設が存在し、現在のユーザーが所属していない施設のクライアントが必要です。

```sql
SELECT c.id, c.name, c.facility_id, f.name as facility_name
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
  AND c.facility_id NOT IN (
    SELECT facility_id 
    FROM user_facility_roles 
    WHERE user_id = auth.uid() 
      AND deleted = FALSE
  )
ORDER BY c.created_at
LIMIT 1;
```

**取得した`id`をメモしてください**

**結果が「No rows returned」の場合**:
- 別の施設のクライアントが存在しないため、このテストはスキップできます
- `runAllRLSTests()` の第2引数は省略してください

---

## 🚀 テスト実行（10分）

### ステップ1: ブラウザでアプリにアクセス

1. `https://carebridge-hub.vercel.app` にアクセス
2. ログインする
3. **F12**キーで開発者ツールを開く
4. **Console**タブを選択

### ステップ2: テストスクリプトを読み込む

1. `docs/test-storage-rls-console-scripts.js` を開く
2. **すべての内容をコピー**（Ctrl+A → Ctrl+C）
3. ブラウザのConsoleタブに**貼り付け**（Ctrl+V）
4. **Enter**キーを押す

以下のメッセージが表示されれば成功：
```
✅ Storage RLSポリシー動作確認スクリプトが読み込まれました
```

### ステップ3: 一括テストを実行

Consoleタブに以下を入力（`YOUR_CLIENT_ID`をステップ1で取得したIDに置き換え）：

```javascript
runAllRLSTests(
  'YOUR_CLIENT_ID',           // 例: 'd34da20a-5f18-4695-ab5b-396f1f81d4a0'
  'OTHER_FACILITY_CLIENT_ID'   // ステップ2で取得したID（オプション）
);
```

**Enter**キーを押して実行

### ステップ4: 結果を確認

以下のような出力が表示されれば成功：

```
🚀 Storage RLSポリシーの動作確認テストを開始します...

📤 テスト1: 自分の施設のクライアントファイルをアップロード
✅ ファイルアップロード成功!

📥 テスト2: 自分の施設のクライアントファイルを読み取る
✅ ダウンロード成功!

🚫 テスト3: 他の施設のファイルは読み取れないことを確認
✅ 期待通り: RLSポリシーによりアクセス拒否されました

✅ すべてのテストが成功しました！RLSポリシーは正しく動作しています。
```

---

## ✅ 成功の基準

以下のすべてが満たされていればOK：

- ✅ **テスト1**: 自分の施設のファイルがアップロードできる
- ✅ **テスト2**: 自分の施設のファイルが読み取れる
- ✅ **テスト3**: 他の施設のファイルは読み取れない（エラー403など）

---

## 🔧 個別テスト（オプション）

### ファイルをアップロード

```javascript
uploadClientTestFile('YOUR_CLIENT_ID');
```

### ファイルを読み取る

```javascript
testDownloadOwnFacilityFile('YOUR_CLIENT_ID/rls-test-file.txt');
```

### 他の施設のファイルは読み取れないことを確認

```javascript
testDownloadOtherFacilityFile('OTHER_FACILITY_CLIENT_ID');
```

### 現在のユーザー情報を確認

```javascript
showCurrentUserInfo();
```

---

## ❌ トラブルシューティング

### エラー: "Supabase client not found"

**解決方法**: 
- ページをリロードしてから再度実行
- ログインしていることを確認

### エラー: "Upload failed" または "Download failed"

**確認事項**:
1. クライアントIDが正しいか
2. ユーザーがそのクライアントの施設に所属しているか
3. Storageバケット "attachments" が作成されているか

### 他の施設のファイルも読み取れてしまう

**解決方法**:
1. `docs/fix-storage-read-policy.sql` を再実行
2. RLSポリシーが正しく作成されているか確認

---

## 📚 詳細なガイド

より詳細な説明が必要な場合は、`docs/test-storage-rls-policy.md` を参照してください。

