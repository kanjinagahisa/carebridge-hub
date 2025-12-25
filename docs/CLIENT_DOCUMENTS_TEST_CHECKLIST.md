# client-documents バケット動作テスト チェックリスト

**対象環境**: 本番（Vercel: carebridge-hub-prod）  
**目的**: Supabase Storage（RLS）が「アプリ経由」で INSERT / SELECT / DELETE を正しく制御できているかを確認

---

## 📋 事前準備

### 1. アクセス確認
- [ ] 本番環境（Vercel）にアクセスできる
- [ ] ログインできる（admin/staff 権限のアカウント）
- [ ] 利用者詳細ページ（`/clients/[id]/profile`）にアクセスできる

### 2. テスト用利用者の確認
- [ ] テスト用の利用者（client）が存在する
- [ ] その利用者のプロフィールページにアクセスできる
- [ ] 「書類」セクションが表示される

---

## ✅ テスト項目

### テスト 1: INSERT（アップロード）

#### 手順
1. [ ] 利用者詳細ページ（`/clients/[id]/profile`）にアクセス
2. [ ] 「書類」セクションを確認
3. [ ] 「書類を追加」ボタンをクリック
4. [ ] ファイル選択ダイアログから、以下のいずれかを選択：
   - PDF ファイル（例: `test-document.pdf`）
   - 画像ファイル（例: `test-image.jpg` または `test-image.png`）
5. [ ] ファイルを選択してアップロードを実行

#### 期待結果
- [ ] アップロードが成功する（エラーメッセージが表示されない）
- [ ] 「アップロード中...」の表示が消える
- [ ] 書類一覧に新しいファイルが表示される
- [ ] ファイル名、種別、作成日時が正しく表示される

#### 確認ポイント
- [ ] ブラウザの開発者ツール（Console）にエラーが表示されない
- [ ] Network タブで、Storage API へのリクエストが成功している（200 または 201）
- [ ] アップロードされたファイルのパスが `${clientId}/${uuid}-${filename}` 形式になっている

#### 想定される失敗パターン
1. **403 Forbidden エラー**
   - **原因**: RLS ポリシーが正しく機能していない、またはユーザー権限が不足
   - **確認**: ユーザーが該当施設の staff/admin 権限を持っているか確認
   - **確認SQL**: 後述の「権限確認SQL」を実行

2. **400 Bad Request エラー**
   - **原因**: ファイル形式が許可されていない、またはファイルサイズが上限を超えている
   - **確認**: ファイル形式が PDF または画像（jpg/png）であることを確認
   - **確認**: ファイルサイズが 50MB 以下であることを確認

3. **500 Internal Server Error**
   - **原因**: サーバー側のエラー（データベース接続エラーなど）
   - **確認**: ブラウザの Console と Network タブでエラー詳細を確認

---

### テスト 2: SELECT（一覧表示・閲覧）



#### 期待結果
- [ ] 書類一覧が正しく表示される（ローディング状態が消える）
- [ ] 各書類のファイル名、種別、作成日時が表示される
- [ ] ダウンロードアイコンをクリックすると、新しいタブでファイルが開く
- [ ] ファイルの内容が正しく表示される（PDF なら PDF ビューア、画像なら画像ビューア）

#### 確認ポイント
- [ ] ブラウザの開発者ツール（Console）にエラーが表示されない
- [ ] Network タブで、Storage API へのリクエストが成功している（200）
- [ ] 署名付きURL（signed URL）が正しく生成されている
- [ ] 他の利用者の書類が表示されない（RLS が正しく機能している）

#### 想定される失敗パターン
1. **書類一覧が表示されない（空の状態）**
   - **原因**: データベースから書類情報が取得できていない、または RLS ポリシーでブロックされている
   - **確認**: 後述の「Storage 確認SQL」を実行して、実際にファイルが存在するか確認

2. **ダウンロード時に 403 Forbidden エラー**
   - **原因**: 署名付きURL の生成に失敗、または Storage の SELECT ポリシーが正しく機能していない
   - **確認**: ブラウザの Console でエラー詳細を確認
   - **確認**: 後述の「Storage 確認SQL」で、ファイルのパスが正しい形式か確認

3. **ダウンロード時に 404 Not Found エラー**
   - **原因**: Storage にファイルが存在しない、またはパスが間違っている
   - **確認**: 後述の「Storage 確認SQL」で、ファイルの存在を確認

---

### テスト 3: DELETE（削除）

#### 手順
1. [ ] 利用者詳細ページ（`/clients/[id]/profile`）にアクセス
2. [ ] 「書類」セクションを確認
3. [ ] 削除したい書類の「削除」アイコン（🗑️）をクリック
4. [ ] 削除確認ダイアログで「削除する」をクリック

#### 期待結果
- [ ] 削除確認ダイアログが表示される
- [ ] 「削除する」をクリックすると、書類が一覧から消える
- [ ] エラーメッセージが表示されない

#### 確認ポイント
- [ ] ブラウザの開発者ツール（Console）にエラーが表示されない
- [ ] Network タブで、Storage API への DELETE リクエストが成功している（200 または 204）
- [ ] データベースからもレコードが削除されている（後述の「Storage 確認SQL」で確認）

#### 想定される失敗パターン
1. **403 Forbidden エラー**
   - **原因**: RLS ポリシーが正しく機能していない、またはユーザー権限が不足
   - **確認**: ユーザーが該当施設の staff/admin 権限を持っているか確認

2. **削除後も一覧に表示される**
   - **原因**: Storage からの削除は成功したが、データベースからの削除が失敗している
   - **確認**: 後述の「Storage 確認SQL」で、データベースのレコードが削除されているか確認

3. **削除確認ダイアログが表示されない**
   - **原因**: フロントエンドの JavaScript エラー
   - **確認**: ブラウザの Console でエラーを確認

---

## 🔍 確認用 SQL

### Storage.objects を確認する SQL

```sql
-- client-documents バケットの最新 N 件を確認
SELECT 
  id,
  bucket_id,
  name,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'client-documents'
ORDER BY created_at DESC
LIMIT 20;
```

### パスから clientId を抽出して確認する SQL

```sql
-- client-documents バケットのファイル一覧（clientId を抽出）
SELECT 
  id,
  bucket_id,
  name,
  split_part(name, '/', 1) as client_id,  -- パスの最初のセグメントが clientId
  split_part(name, '/', 2) as file_name,   -- パスの2番目のセグメントがファイル名
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'client-documents'
ORDER BY created_at DESC
LIMIT 20;
```

### 特定の利用者の書類のみを確認する SQL

```sql
-- 特定の利用者（clientId）の書類のみを確認
-- 注意: 'YOUR_CLIENT_ID_HERE' を実際の clientId に置き換えてください
SELECT 
  id,
  bucket_id,
  name,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND name LIKE 'YOUR_CLIENT_ID_HERE/%'  -- パスの先頭が clientId で始まる
ORDER BY created_at DESC;
```

### データベース（client_documents テーブル）と Storage の整合性を確認する SQL

```sql
-- client_documents テーブルと storage.objects の整合性確認
SELECT 
  cd.id as document_id,
  cd.client_id,
  cd.name as document_name,
  cd.path,
  cd.created_at as db_created_at,
  so.id as storage_object_id,
  so.created_at as storage_created_at,
  CASE 
    WHEN so.id IS NULL THEN 'Storage に存在しない'
    WHEN cd.id IS NULL THEN 'DB に存在しない（想定外）'
    ELSE 'OK'
  END as status
FROM client_documents cd
LEFT JOIN storage.objects so ON so.bucket_id = 'client-documents' AND so.name = cd.path
WHERE cd.deleted = false
ORDER BY cd.created_at DESC
LIMIT 20;
```

### 権限確認 SQL（ユーザーが該当施設の staff/admin 権限を持っているか確認）

```sql
-- 特定のユーザーが特定の利用者（client）の書類を操作できる権限があるか確認
-- 注意: 'YOUR_USER_ID_HERE' と 'YOUR_CLIENT_ID_HERE' を実際の値に置き換えてください
SELECT 
  u.id as user_id,
  u.display_name,
  c.id as client_id,
  c.name as client_name,
  f.id as facility_id,
  f.name as facility_name,
  ufr.role,
  CASE 
    WHEN ufr.role IN ('admin', 'staff') THEN '権限あり'
    ELSE '権限なし'
  END as permission_status
FROM users u
JOIN user_facility_roles ufr ON ufr.user_id = u.id
JOIN facilities f ON f.id = ufr.facility_id
JOIN clients c ON c.facility_id = f.id
WHERE u.id = 'YOUR_USER_ID_HERE'::uuid
  AND c.id = 'YOUR_CLIENT_ID_HERE'::uuid
  AND ufr.deleted = false
  AND f.deleted = false
  AND c.deleted = false;
```

---

## 📝 テスト結果記録

### テスト実施日時
- **日時**: 2025-12-12
- **実施者**: _______________
- **環境**: carebridge-hub-prod（本番）

### テスト結果サマリー

| テスト項目 | 結果 | 備考 |
|---------|------|------|
| INSERT（アップロード） | ✅ | HEIC、MP4、MOV ファイルが選択可能。アップロード成功 |
| SELECT（一覧表示・閲覧） | ✅ | 書類一覧が正しく表示。PDF、画像、動画が正しく表示 |
| DELETE（削除） | ⏳ | 未テスト（必要に応じて実施） |

### 発見された問題

1. **問題1**: 
   - **現象**: 
   - **再現手順**: 
   - **想定原因**: 
   - **対応**: 

2. **問題2**: 
   - **現象**: 
   - **再現手順**: 
   - **想定原因**: 
   - **対応**: 

---

## 🎯 完了条件

すべてのテスト項目が ✅ になれば、client-documents バケットの動作テストは完了です。

- [x] INSERT（アップロード）が成功する ✅
- [x] SELECT（一覧表示・閲覧）が成功する ✅
- [ ] DELETE（削除）が成功する（未テスト）
- [x] 想定される失敗パターンが発生しない、または発生した場合は原因が特定できている ✅

## ✅ テスト完了報告（2025-12-12）

### 成功した項目

1. **ファイル選択機能**
   - ✅ HEIC ファイル（`.heic`, `.heif`）が選択可能
   - ✅ MP4 ファイル（`.mp4`）が選択可能
   - ✅ MOV ファイル（`.mov`）が選択可能
   - ✅ PNG、PDF ファイルも引き続き選択可能

2. **アップロード機能**
   - ✅ 各ファイルタイプのアップロードが成功
   - ✅ エラーメッセージが表示されない

3. **一覧表示機能**
   - ✅ アップロードした書類が一覧に正しく表示される
   - ✅ ファイル名、作成日時が正しく表示される

4. **ダウンロード・表示機能**
   - ✅ PDF ファイルが正しく表示される（PDF ビューア）
   - ✅ 画像ファイルが正しく表示される（画像ビューア）
   - ✅ 動画ファイルが正しくダウンロード・表示される

### 実装完了

- ✅ Storageバケット設定: `allowed_mime_types` に `video/*` を追加
- ✅ フロントエンド修正: `accept` 属性を `*/*` に変更
- ✅ クライアント側バリデーション: 許可されたファイルタイプのみアップロード可能
- ✅ Vercel デプロイ: 正常にデプロイ完了





