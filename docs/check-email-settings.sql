-- ============================================================================
-- 確認メール送信状況の確認クエリ
-- ============================================================================
-- このクエリで、最新のユーザー登録とメール送信状況を確認できます
-- ============================================================================

-- 1. 最新のユーザーを確認（メール確認状況を含む）
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '確認済み'
    WHEN confirmation_sent_at IS NOT NULL THEN 'メール送信済み（未確認）'
    ELSE 'メール未送信'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. メール確認待ちのユーザー数を確認
SELECT 
  COUNT(*) as pending_confirmation_count
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND confirmation_sent_at IS NOT NULL;

-- 3. メール送信されていないユーザー数を確認
SELECT 
  COUNT(*) as no_email_sent_count
FROM auth.users
WHERE email_confirmed_at IS NULL
  AND confirmation_sent_at IS NULL;









