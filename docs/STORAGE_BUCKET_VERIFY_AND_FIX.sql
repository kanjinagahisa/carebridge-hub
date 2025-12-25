-- ============================================================================
-- client-documents バケット設定の確認と修正用 SQL
-- ============================================================================

-- 1. 現在の設定を確認
SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE id = 'client-documents';

-- ============================================================================
-- 2. もし設定が正しくない場合、以下の SQL を実行してください
-- ============================================================================

-- client-documents バケットの allowed_mime_types を正しく更新
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/*', 'video/*']::text[]
WHERE id = 'client-documents';

-- ============================================================================
-- 3. 更新後の確認（再度実行）
-- ============================================================================

SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit,
  -- 各要素を個別に確認
  allowed_mime_types[1] as mime_type_1,
  allowed_mime_types[2] as mime_type_2,
  allowed_mime_types[3] as mime_type_3
FROM storage.buckets
WHERE id = 'client-documents';

-- ============================================================================
-- 期待される結果:
-- allowed_mime_types: ["application/pdf", "image/*", "video/*"]
-- mime_type_1: "application/pdf"
-- mime_type_2: "image/*"
-- mime_type_3: "video/*"
-- ============================================================================





