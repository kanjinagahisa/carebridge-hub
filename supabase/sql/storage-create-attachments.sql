-- ============================================================================
-- Storage バケット作成用 SQL（本番環境専用）
-- ============================================================================
-- 
-- ⚠️ 重要: この SQL は本番 Supabase（carebridge-hub-prod）専用です
-- ⚠️ 開発プロジェクト（carebridge-hub-dev）では実行しないでください
-- 
-- 前提条件:
-- - 既存バケットがない前提で設計されています
-- - 実行前にバックアップを取得してください（Free Planの場合はスキップ可能）
--   ※ Free Planでは手動バックアップ機能が利用できませんが、
--      このSQLは新規バケット作成のみで既存データを変更しないため安全です
-- - 本番プロジェクト（carebridge-hub-prod）を選択していることを確認してください
--
-- この SQL は以下を行います:
-- 1. attachments バケットの作成
-- 2. client-documents バケットの作成（開発環境を参照）
-- 3. attachments バケット用の RLS ポリシー設定（最新版）
-- 4. client-documents バケット用の RLS ポリシー設定
--
-- 実行手順:
-- 1. Supabase ダッシュボード → 本番プロジェクト（carebridge-hub-prod）を選択
-- 2. SQL Editor → New query
-- 3. この SQL を貼り付ける
-- 4. Run ボタンをクリック（または Cmd+Enter / Ctrl+Enter）
-- ============================================================================

-- ============================================================================
-- ステップ1: Storage バケットの作成
-- ============================================================================

-- attachments バケットの作成
-- 既に存在する場合はエラーになります（安全のため）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,  -- Private bucket（非公開）
  52428800,  -- 50MB (50 * 1024 * 1024)
  ARRAY['image/*', 'application/pdf', 'video/*']::text[]
)
ON CONFLICT (id) DO NOTHING;  -- 既に存在する場合は何もしない

-- client-documents バケットの作成（開発環境を参照）
-- 開発環境に存在するため、本番環境にも作成することを推奨
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,  -- Private bucket（非公開）
  52428800,  -- 50MB (50 * 1024 * 1024)
  ARRAY['application/pdf', 'image/*']::text[]
)
ON CONFLICT (id) DO NOTHING;  -- 既に存在する場合は何もしない

-- ============================================================================
-- ステップ2: Storage RLS ポリシーの設定（attachments バケット用）
-- ============================================================================
-- 
-- 注意: これらのポリシーは Migration 057, 058 から抽出した最新版です
-- 既存のポリシーがある場合は、一度削除してから再作成します
-- ============================================================================

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to attachments bucket
-- File path format: {client_id}/{filename} or {group_id}/{filename}
-- ファイルパスの最初のセグメント（client_id または group_id）が
-- ユーザーが所属する施設の client/group に属していることを確認
CREATE POLICY "Users can upload attachments to their facilities"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- パスが有効な group_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from attachments bucket
-- INSERT ポリシーと同じロジックを使用
CREATE POLICY "Users can read attachments from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- パスが有効な group_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from attachments bucket
-- INSERT ポリシーと同じロジックを使用
CREATE POLICY "Users can delete attachments from their facilities"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
    OR
    -- パスが有効な group_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM groups g
      INNER JOIN user_facility_roles ufr ON g.facility_id = ufr.facility_id
      WHERE g.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND g.deleted = FALSE
    )
  )
);

-- ============================================================================
-- ステップ3: Storage RLS ポリシーの設定（client-documents バケット用）
-- ============================================================================
-- 
-- 注意: これらのポリシーは client_documents テーブルの RLS ポリシー（Migration 027）
-- を参考に、Storage 用に設計したものです
-- 既存のポリシーがある場合は、一度削除してから再作成します
-- ============================================================================

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can upload client documents to their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can read client documents from their facilities" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete client documents from their facilities" ON storage.objects;

-- Policy: Authenticated users can upload files to client-documents bucket
-- File path format: {client_id}/{filename}
-- ファイルパスの最初のセグメント（client_id）が
-- ユーザーが所属する施設の client に属していることを確認
CREATE POLICY "Users can upload client documents to their facilities"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can read files from client-documents bucket
-- INSERT ポリシーと同じロジックを使用
CREATE POLICY "Users can read client documents from their facilities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = (split_part((storage.objects.name)::text, '/', 1))
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
  )
);

-- Policy: Authenticated users can delete files from client-documents bucket
-- INSERT ポリシーと同じロジックを使用
CREATE POLICY "Users can delete client documents from their facilities"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- パスが有効な client_id で始まり、ユーザーの施設に属しているか確認
    EXISTS (
      SELECT 1 
      FROM clients c
      INNER JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
      WHERE c.id::text = split_part((storage.objects.name)::text, '/', 1)
        AND ufr.user_id = auth.uid()
        AND ufr.deleted = FALSE
        AND c.deleted = FALSE
    )
  )
);

-- ============================================================================
-- ステップ4: 実行結果の確認（オプション）
-- ============================================================================
-- 
-- 以下の SQL を実行して、バケットとポリシーが正しく作成されたか確認できます
-- （この SQL の実行後、別のクエリとして実行してください）
-- ============================================================================

-- バケットの存在確認
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id IN ('attachments', 'client-documents');

-- ポリシーの存在確認（attachments バケット用）
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND policyname LIKE '%attachments%'
-- ORDER BY policyname;

-- ポリシーの存在確認（client-documents バケット用）
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND policyname LIKE '%client documents%'
-- ORDER BY policyname;

-- すべてのStorageポリシーを確認（attachments と client-documents の両方）
-- SELECT 
--   policyname,
--   cmd,
--   CASE 
--     WHEN policyname LIKE '%attachments%' THEN 'attachments'
--     WHEN policyname LIKE '%client documents%' THEN 'client-documents'
--     ELSE 'other'
--   END AS bucket_name
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND (policyname LIKE '%attachments%' OR policyname LIKE '%client documents%')
-- ORDER BY bucket_name, cmd;

-- ============================================================================
-- 完了
-- ============================================================================
-- 
-- SQL の実行が成功したら、以下を確認してください:
-- 1. Supabase ダッシュボード → Storage → Buckets でバケットが表示されているか
--    - attachments バケット
--    - client-documents バケット
-- 2. Supabase ダッシュボード → Storage → Policies でポリシーが表示されているか
--    - attachments バケット: 3つのポリシー（INSERT, SELECT, DELETE）
--    - client-documents バケット: 3つのポリシー（INSERT, SELECT, DELETE）
-- 3. 必要に応じて、サンプルファイルのアップロードテストを実施
-- 
-- 詳細は docs/STORAGE_RECOVERY_GUIDE.md を参照してください
-- ============================================================================







