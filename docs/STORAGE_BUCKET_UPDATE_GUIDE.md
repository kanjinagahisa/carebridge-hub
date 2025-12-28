# Storageバケット設定更新ガイド

**対象**: `client-documents` バケット  
**目的**: HEIC、MP4、MOV ファイルをアップロード可能にする

---

## 📋 現状確認

### フロントエンド側（修正済み ✅）

`components/client/ClientDocumentsCard.tsx` の `accept` 属性を以下のように修正しました：

```typescript
accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx,.mp4,.mov,image/*,video/*,application/pdf"
```

これにより、ブラウザのファイル選択ダイアログで以下が選択可能になります：
- ✅ HEIC ファイル（`.heic`, `.heif`）
- ✅ 動画ファイル（`.mp4`, `.mov`）
- ✅ 画像ファイル（`.jpg`, `.jpeg`, `.png`）
- ✅ PDF ファイル（`.pdf`）
- ✅ Word ファイル（`.doc`, `.docx`）

---

## ⚠️ 必要な設定変更

### Storageバケットの `allowed_mime_types` を更新

**現状**: `["application/pdf", "image/*"]`  
**必要**: `["application/pdf", "image/*", "video/*"]`

**理由**: 
- フロントエンド側で `accept` 属性に `video/*` を追加しましたが、Storageバケット側でも `video/*` を許可する必要があります
- バケット側で許可されていないと、アップロード時にエラーになります

---

## 🔧 設定変更手順（Supabase Dashboard）

### 方法1: SQL Editor から変更（推奨・最も確実）

Supabase Dashboard の SQL Editor を使用する方法が最も確実で簡単です。

1. **Supabase Dashboard にアクセス**
   - 本番プロジェクト（`carebridge-hub-prod`）を開く
   - URL: https://supabase.com/dashboard/project/[PROJECT_ID]

2. **SQL Editor を開く**
   - 左サイドバーから「SQL Editor」をクリック
   - 「New query」をクリック

3. **以下の SQL を実行**
   ```sql
   -- client-documents バケットの allowed_mime_types を更新
   UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['application/pdf', 'image/*', 'video/*']::text[]
   WHERE id = 'client-documents';
   ```

4. **実行**
   - 「Run」ボタンをクリック（または `Cmd+Enter` / `Ctrl+Enter`）
   - 「Success」と表示されれば完了

5. **確認**
   - 以下の SQL を実行して、設定が正しく更新されたか確認：
   ```sql
   SELECT 
     id,
     name,
     allowed_mime_types,
     file_size_limit
   FROM storage.buckets
   WHERE id = 'client-documents';
   ```
   - `allowed_mime_types` に `video/*` が含まれていることを確認

---

### 方法2: Supabase Dashboard の UI から変更（オプション）

**注意**: Supabase Dashboard の UI はバージョンによって異なる場合があります。UI から設定が見つからない場合は、**方法1（SQL Editor）を使用してください**。

1. **Supabase Dashboard にアクセス**
   - 本番プロジェクト（`carebridge-hub-prod`）を開く

2. **Storage セクションに移動**
   - 左サイドバーから「Storage」をクリック

3. **`client-documents` バケットを開く**
   - バケット一覧から「client-documents」をクリック

4. **バケット設定を編集**
   - 画面右上の「**Edit bucket**」ボタンをクリック
   - モーダルまたはページが開きます

5. **`allowed_mime_types` を更新**
   - 「Allowed MIME types」または「MIME types」フィールドを探す
   - 現在: `["application/pdf", "image/*"]`
   - 変更後: `["application/pdf", "image/*", "video/*"]`
   - または、配列形式で入力: `application/pdf, image/*, video/*`

6. **保存**
   - 「Save」または「Update」ボタンをクリック

**もし「Edit bucket」ボタンから設定が見つからない場合**:
- 方法1（SQL Editor）を使用してください。こちらが最も確実です。

Supabase Dashboard の SQL Editor で以下の SQL を実行：

```sql
-- client-documents バケットの allowed_mime_types を更新
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/*', 'video/*']::text[]
WHERE id = 'client-documents';
```

**確認用 SQL**:
```sql
-- 更新後の設定を確認
SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'client-documents';
```

---

## ✅ 確認手順

### 1. バケット設定の確認

SQL Editor で以下を実行：

```sql
SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'client-documents';
```

**期待される結果**:
```
allowed_mime_types: ["application/pdf", "image/*", "video/*"]
```

### 2. 動作確認

1. 本番環境（Vercel）にアクセス
2. `/clients/[id]/profile` ページを開く
3. 「書類を追加」ボタンをクリック
4. ファイル選択ダイアログで以下を確認：
   - ✅ HEIC ファイル（`.heic`）が選択可能
   - ✅ MP4 ファイル（`.mp4`）が選択可能
   - ✅ MOV ファイル（`.mov`）が選択可能
5. 実際にアップロードして、エラーが発生しないことを確認

---

## 📝 注意事項

### ファイルサイズ制限

現在の `file_size_limit` は **50MB** です。動画ファイルは大きくなる可能性があるため、必要に応じて制限を調整してください。

**制限を変更する場合**:
```sql
-- 100MB に変更する例
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB (100 * 1024 * 1024)
WHERE id = 'client-documents';
```

### HEIC ファイルについて

- HEIC は Apple の画像形式で、一部のブラウザ（特に Safari 以外）では完全にサポートされていない場合があります
- ブラウザによっては、HEIC ファイルを選択できても、アップロード後に表示できない可能性があります
- 必要に応じて、クライアント側で HEIC を JPEG/PNG に変換する処理を追加することを検討してください

### 動画ファイルについて

- MP4 と MOV は一般的な動画形式ですが、ブラウザでの再生には適切なコーデックが必要です
- 大きな動画ファイルはアップロードに時間がかかる可能性があります
- ストリーミング再生が必要な場合は、別途検討が必要です

---

## 🎯 完了条件

- [ ] Storageバケットの `allowed_mime_types` に `video/*` が追加されている
- [ ] フロントエンド側の `accept` 属性に動画ファイルが含まれている（✅ 完了済み）
- [ ] 本番環境で HEIC、MP4、MOV ファイルが選択可能である
- [ ] 本番環境で実際にアップロードが成功する






