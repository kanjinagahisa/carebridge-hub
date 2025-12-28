-- ============================================================================
-- client-documents バケット確認用 SQL
-- ============================================================================
-- 本番環境（carebridge-hub-prod）で Supabase Storage に保存された
-- client-documents バケットの内容を確認するための SQL クエリ集
--
-- 使用方法:
-- 1. Supabase Dashboard の SQL Editor を開く
-- 2. 本番プロジェクト（carebridge-hub-prod）を選択
-- 3. 以下のクエリを実行
-- ============================================================================

-- ============================================================================
-- 1. client-documents バケットの最新 N 件を確認
-- ============================================================================
-- 最新 20 件のファイルを確認
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

-- ============================================================================
-- 2. パスから clientId を抽出して確認
-- ============================================================================
-- パスの最初のセグメントが clientId、2番目のセグメントがファイル名
-- 形式: ${clientId}/${uuid}-${filename}
SELECT 
  id,
  bucket_id,
  name as full_path,
  split_part(name, '/', 1) as client_id,  -- パスの最初のセグメントが clientId
  split_part(name, '/', 2) as file_name,   -- パスの2番目のセグメントがファイル名（uuid-filename形式）
  created_at,
  updated_at,
  pg_size_pretty((metadata->>'size')::bigint) as file_size
FROM storage.objects
WHERE bucket_id = 'client-documents'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 3. 特定の利用者（clientId）の書類のみを確認
-- ============================================================================
-- 注意: 'YOUR_CLIENT_ID_HERE' を実際の clientId に置き換えてください
-- 例: WHERE name LIKE '550e8400-e29b-41d4-a716-446655440000/%'
SELECT 
  id,
  bucket_id,
  name,
  split_part(name, '/', 2) as file_name,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND name LIKE 'YOUR_CLIENT_ID_HERE/%'  -- パスの先頭が clientId で始まる
ORDER BY created_at DESC;

-- ============================================================================
-- 4. データベース（client_documents テーブル）と Storage の整合性確認
-- ============================================================================
-- client_documents テーブルのレコードと storage.objects のファイルが
-- 正しく対応しているか確認
SELECT 
  cd.id as document_id,
  cd.client_id,
  cd.name as document_name,
  cd.path,
  cd.created_at as db_created_at,
  so.id as storage_object_id,
  so.created_at as storage_created_at,
  CASE 
    WHEN so.id IS NULL THEN '❌ Storage に存在しない'
    WHEN cd.id IS NULL THEN '⚠️ DB に存在しない（想定外）'
    ELSE '✅ OK'
  END as status
FROM client_documents cd
LEFT JOIN storage.objects so 
  ON so.bucket_id = 'client-documents' 
  AND so.name = cd.path
WHERE cd.deleted = false
ORDER BY cd.created_at DESC
LIMIT 20;

-- ============================================================================
-- 5. Storage に存在するが DB に存在しないファイル（孤立ファイル）を確認
-- ============================================================================
-- 注意: 通常は存在しないはずですが、エラー時のロールバック失敗などで
-- 発生する可能性があります
SELECT 
  so.id,
  so.name,
  so.created_at,
  split_part(so.name, '/', 1) as client_id
FROM storage.objects so
WHERE so.bucket_id = 'client-documents'
  AND NOT EXISTS (
    SELECT 1 
    FROM client_documents cd 
    WHERE cd.path = so.name 
      AND cd.deleted = false
  )
ORDER BY so.created_at DESC
LIMIT 20;

-- ============================================================================
-- 6. DB に存在するが Storage に存在しないファイル（参照切れ）を確認
-- ============================================================================
-- 注意: 通常は存在しないはずですが、Storage からの削除が失敗した場合などで
-- 発生する可能性があります
SELECT 
  cd.id,
  cd.client_id,
  cd.name,
  cd.path,
  cd.created_at
FROM client_documents cd
WHERE cd.deleted = false
  AND NOT EXISTS (
    SELECT 1 
    FROM storage.objects so 
    WHERE so.bucket_id = 'client-documents' 
      AND so.name = cd.path
  )
ORDER BY cd.created_at DESC
LIMIT 20;

-- ============================================================================
-- 7. 利用者ごとの書類数を集計
-- ============================================================================
SELECT 
  split_part(so.name, '/', 1) as client_id,
  COUNT(*) as document_count,
  SUM((so.metadata->>'size')::bigint) as total_size_bytes,
  pg_size_pretty(SUM((so.metadata->>'size')::bigint)) as total_size_pretty
FROM storage.objects so
WHERE so.bucket_id = 'client-documents'
GROUP BY split_part(so.name, '/', 1)
ORDER BY document_count DESC
LIMIT 20;

-- ============================================================================
-- 8. 最近アップロードされたファイル（直近24時間）
-- ============================================================================
SELECT 
  id,
  bucket_id,
  name,
  split_part(name, '/', 1) as client_id,
  split_part(name, '/', 2) as file_name,
  created_at,
  pg_size_pretty((metadata->>'size')::bigint) as file_size
FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================================================
-- 9. バケットの統計情報
-- ============================================================================
SELECT 
  bucket_id,
  COUNT(*) as total_files,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size_pretty,
  MIN(created_at) as oldest_file,
  MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'client-documents'
GROUP BY bucket_id;






