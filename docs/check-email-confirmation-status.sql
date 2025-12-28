-- ============================================
-- 確認メール送信状況の確認用SQL
-- ============================================

-- 最新のユーザーを確認
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ メール確認済み'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 確認メール送信済み（未確認）'
    ELSE '⚠️ 確認メール未送信'
  END AS status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 特定のメールアドレスの状態を確認
-- {EMAIL} を実際のメールアドレスに置き換えてください
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmation_sent_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ メール確認済み'
    WHEN confirmation_sent_at IS NOT NULL THEN '📧 確認メール送信済み（未確認）'
    ELSE '⚠️ 確認メール未送信'
  END AS status,
  -- 確認メール送信から現在までの経過時間（分）
  CASE 
    WHEN confirmation_sent_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (NOW() - confirmation_sent_at)) / 60
    ELSE NULL
  END AS minutes_since_confirmation_sent
FROM auth.users
WHERE email = 'kanjinagatomi99@gmail.com';






