# Storageバケット設定完了後の次のステップ

**完了した作業**:
- ✅ Storageバケットの `allowed_mime_types` を `["application/pdf", "image/*", "video/*"]` に更新
- ✅ フロントエンド側の `accept` 属性に動画ファイル（`.mp4`, `.mov`, `video/*`）と HEIC（`.heic`, `.heif`, `image/*`）を追加

---

## 🎯 次のステップ：本番環境での動作確認

### 1. 本番環境（Vercel）にアクセス

1. **本番環境のURLにアクセス**
   - URL: `https://carebridge-hub.vercel.app`（または実際の本番URL）
   - ログイン（admin/staff 権限のアカウントで）

2. **利用者詳細ページに移動**
   - 利用者一覧から任意の利用者を選択
   - または、直接 `/clients/[id]/profile` にアクセス

---

### 2. ファイル選択の確認

1. **「書類を追加」ボタンをクリック**
   - `/clients/[id]/profile` ページの「書類」セクションにある青いボタン

2. **ファイル選択ダイアログで確認**
   - ✅ **HEIC ファイル**（`.heic`, `.heif`）が選択可能であることを確認
   - ✅ **MP4 ファイル**（`.mp4`）が選択可能であることを確認
   - ✅ **MOV ファイル**（`.mov`）が選択可能であることを確認
   - ✅ **PNG/JPEG ファイル**が選択可能であることを確認（既存機能）
   - ✅ **PDF ファイル**が選択可能であることを確認（既存機能）

**確認ポイント**:
- ファイルがグレーアウトされていない（選択可能な状態）
- 「開く」ボタンが有効になる

---

### 3. アップロードのテスト

#### テスト1: HEIC ファイルのアップロード

1. **HEIC ファイルを選択**
   - ファイル選択ダイアログで `.heic` または `.heif` ファイルを選択
   - 「開く」をクリック

2. **アップロードの確認**
   - 「アップロード中...」の表示が消える
   - エラーメッセージが表示されない
   - 書類一覧に新しいファイルが表示される

3. **ブラウザの開発者ツールで確認**
   - Console タブ: エラーが表示されていないか確認
   - Network タブ: Storage API へのリクエストが成功しているか確認（ステータスコード 200 または 201）

#### テスト2: MP4 ファイルのアップロード

1. **MP4 ファイルを選択**
   - ファイル選択ダイアログで `.mp4` ファイルを選択
   - 「開く」をクリック

2. **アップロードの確認**
   - 上記と同様に、エラーなくアップロードが完了することを確認

#### テスト3: MOV ファイルのアップロード

1. **MOV ファイルを選択**
   - ファイル選択ダイアログで `.mov` ファイルを選択
   - 「開く」をクリック

2. **アップロードの確認**
   - 上記と同様に、エラーなくアップロードが完了することを確認

---

### 4. アップロード後の確認

#### ファイルの表示確認

1. **書類一覧の確認**
   - アップロードしたファイルが一覧に表示されている
   - ファイル名、種別、作成日時が正しく表示されている

2. **ダウンロードの確認**
   - ダウンロードアイコン（⬇️）をクリック
   - 新しいタブでファイルが開く、またはダウンロードが開始される

#### Storage への保存確認（オプション）

Supabase SQL Editor で以下を実行して、実際に Storage に保存されているか確認：

```sql
-- 最新のアップロードファイルを確認
SELECT 
  id,
  bucket_id,
  name,
  split_part(name, '/', 1) as client_id,
  split_part(name, '/', 2) as file_name,
  created_at,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'client-documents'
ORDER BY created_at DESC
LIMIT 10;
```

**確認ポイント**:
- アップロードしたファイルが `storage.objects` に存在する
- `mime_type` が正しく設定されている（例: `image/heic`, `video/mp4`, `video/quicktime`）

---

## ⚠️ 問題が発生した場合

### エラー1: ファイルが選択できない

**症状**: ファイル選択ダイアログで HEIC/MP4/MOV がグレーアウトされている

**確認事項**:
1. ブラウザをリロード（`Cmd+R` / `Ctrl+R`）
2. ブラウザのキャッシュをクリア
3. 別のブラウザで試す（Safari、Chrome、Firefox など）

**原因の可能性**:
- ブラウザのキャッシュが古い
- ブラウザが HEIC 形式をサポートしていない（HEIC の場合）

---

### エラー2: アップロード時に 400 Bad Request エラー

**症状**: ファイルを選択してアップロードしようとすると、400 エラーが発生

**確認事項**:
1. ファイルサイズが 50MB 以下であることを確認
2. ブラウザの Console でエラーメッセージを確認
3. Network タブでリクエストの詳細を確認

**原因の可能性**:
- ファイルサイズが制限を超えている
- MIME タイプが正しく検出されていない

**対応**:
- ファイルサイズを確認し、必要に応じて Storage バケットの `file_size_limit` を調整

---

### エラー3: アップロード時に 403 Forbidden エラー

**症状**: アップロードしようとすると、403 エラーが発生

**確認事項**:
1. ユーザーが該当施設の staff/admin 権限を持っているか確認
2. RLS ポリシーが正しく設定されているか確認

**確認用 SQL**:
```sql
-- ユーザーの権限を確認
SELECT 
  u.id as user_id,
  u.display_name,
  c.id as client_id,
  c.name as client_name,
  f.id as facility_id,
  f.name as facility_name,
  ufr.role
FROM users u
JOIN user_facility_roles ufr ON ufr.user_id = u.id
JOIN facilities f ON f.id = ufr.facility_id
JOIN clients c ON c.facility_id = f.id
WHERE u.id = auth.uid()  -- 現在ログインしているユーザー
  AND ufr.deleted = false
  AND f.deleted = false
  AND c.deleted = false;
```

---

## ✅ 完了条件

すべてのテストが成功すれば、設定は完了です：

- [ ] HEIC ファイルが選択可能
- [ ] MP4 ファイルが選択可能
- [ ] MOV ファイルが選択可能
- [ ] 各ファイルタイプのアップロードが成功
- [ ] アップロード後のファイルが一覧に表示される
- [ ] ダウンロードが正常に動作する

---

## 📝 参考資料

- 詳細なテストチェックリスト: `docs/CLIENT_DOCUMENTS_TEST_CHECKLIST.md`
- Storage 確認用 SQL: `docs/check-client-documents-storage.sql`
- Storage バケット設定ガイド: `docs/STORAGE_BUCKET_UPDATE_GUIDE.md`






