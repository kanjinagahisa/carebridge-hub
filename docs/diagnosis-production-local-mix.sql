-- ============================================
-- CareBridge Hub 本番/ローカル混線状態の診断用SQL
-- ============================================
-- 
-- 【重要】このファイルは読み取り専用の診断クエリです
-- データの変更・削除は一切行いません
--
-- 使用方法：
-- 1. Supabase ダッシュボード → SQL Editor を開く
-- 2. このファイルのクエリをコピーして実行
-- 3. 結果をコピーして、診断レポートに貼り付け
--
-- ============================================

-- ============================================
-- ステップ3-1: 対象テーブル一覧の確認
-- ============================================
-- このクエリで、publicスキーマ内の全テーブル一覧を取得します
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- ステップ3-2: 主要テーブルのカラム確認
-- ============================================

-- clients テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- client_documents テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'client_documents'
ORDER BY ordinal_position;

-- groups テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'groups'
ORDER BY ordinal_position;

-- posts テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
ORDER BY ordinal_position;

-- post_reads テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'post_reads'
ORDER BY ordinal_position;

-- post_reactions テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'post_reactions'
ORDER BY ordinal_position;

-- user_facility_roles テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_facility_roles'
ORDER BY ordinal_position;

-- facilities テーブルのカラム構造
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'facilities'
ORDER BY ordinal_position;

-- attachments テーブルのカラム構造（存在する場合）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'attachments'
ORDER BY ordinal_position;

-- ============================================
-- 補足: データ件数の確認（参考情報）
-- ============================================
-- 以下のクエリで、各テーブルのデータ件数を確認できます
-- （本番/開発の区別に役立ちます）

SELECT 
  'facilities' as table_name, COUNT(*) as row_count FROM facilities WHERE deleted = FALSE
UNION ALL
SELECT 'users', COUNT(*) FROM users WHERE deleted = FALSE
UNION ALL
SELECT 'user_facility_roles', COUNT(*) FROM user_facility_roles WHERE deleted = FALSE
UNION ALL
SELECT 'clients', COUNT(*) FROM clients WHERE deleted = FALSE
UNION ALL
SELECT 'client_documents', COUNT(*) FROM client_documents WHERE deleted = FALSE
UNION ALL
SELECT 'groups', COUNT(*) FROM groups WHERE deleted = FALSE
UNION ALL
SELECT 'posts', COUNT(*) FROM posts WHERE deleted = FALSE
UNION ALL
SELECT 'post_reactions', COUNT(*) FROM post_reactions
UNION ALL
SELECT 'post_reads', COUNT(*) FROM post_reads
ORDER BY table_name;

-- ============================================
-- ステップ5: 重要なカラムと制約の確認
-- ============================================
-- Migration 036 で追加された posts.client_id の確認

-- posts テーブルの client_id カラムの存在確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'client_id';

-- posts テーブルの group_id が nullable か確認
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'group_id';

-- posts テーブルの制約確認（posts_group_or_client_check）
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND constraint_name LIKE '%group_or_client%';

-- ============================================
-- ステップ6: Migration 適用状況の確認
-- ============================================
-- 主要な Migration が適用されているかを確認

-- Migration 026: client_documents テーブルの存在確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'client_documents'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as client_documents_table_status;

-- Migration 036: posts.client_id カラムの存在確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'posts'
      AND column_name = 'client_id'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as posts_client_id_status;

-- Migration 036: posts.group_id が nullable か確認
SELECT 
  CASE 
    WHEN is_nullable = 'YES' THEN '✅ nullable（Migration 036 適用済み）'
    ELSE '❌ NOT NULL（Migration 036 未適用）'
  END as posts_group_id_nullable_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name = 'group_id';

-- ============================================
-- ステップ7: インデックスの確認
-- ============================================
-- Migration 036 で追加されたインデックスの確認

-- posts テーブルに関連するインデックス一覧
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'posts'
ORDER BY indexname;

-- client_id に関連するインデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexdef LIKE '%client_id%'
    OR tablename = 'posts'
  )
ORDER BY tablename, indexname;

-- ============================================
-- ステップ8: Storage バケットの確認（参考）
-- ============================================
-- 注意: Storage バケットの存在確認は SQL では直接確認できません
-- Supabase ダッシュボード → Storage → Buckets で確認してください
-- 
-- 確認すべきバケット:
-- - attachments (Migration 041 で作成される想定)

-- ============================================
-- 補足: プロジェクト情報の確認
-- ============================================
-- 現在のSupabaseプロジェクトのURLを確認するには、
-- Supabase ダッシュボードの Settings → API → Project URL を参照してください
-- 
-- このSQLクエリでは、プロジェクトURLは取得できません
-- （Supabase ダッシュボードで確認してください）






