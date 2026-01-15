-- ============================================================================
-- Storage ポリシー確認用 SQL
-- ============================================================================
-- 
-- この SQL は、attachments と client-documents バケットの
-- RLS ポリシーが正しく作成されているかを確認するためのものです
-- 
-- 実行手順:
-- 1. Supabase ダッシュボード → 本番プロジェクト（carebridge-hub-prod）を選択
-- 2. SQL Editor → New query
-- 3. この SQL を貼り付ける
-- 4. Run ボタンをクリック
-- ============================================================================

-- バケットの存在確認
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('attachments', 'client-documents')
ORDER BY id;

-- ポリシーの存在確認（詳細）
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  CASE 
    WHEN policyname LIKE '%attachments%' THEN 'attachments'
    WHEN policyname LIKE '%client documents%' THEN 'client-documents'
    ELSE 'other'
  END AS "バケット名",
  roles AS "対象ロール"
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%attachments%' OR policyname LIKE '%client documents%')
ORDER BY "バケット名", 
  CASE cmd
    WHEN 'INSERT' THEN 1
    WHEN 'SELECT' THEN 2
    WHEN 'DELETE' THEN 3
    ELSE 4
  END;

-- 期待される結果:
-- attachments バケット: 3つのポリシー（INSERT, SELECT, DELETE）
-- client-documents バケット: 3つのポリシー（INSERT, SELECT, DELETE）
-- 合計: 6つのポリシー







