-- ============================================
-- 確認4: ユーザーアカウントは残っていることを確認
-- ============================================
-- オプションAでは、ユーザーアカウント自体は残っているはずです

SELECT 
  email,
  created_at,
  last_sign_in_at,
  '✅ ユーザーアカウントは残っています' AS status
FROM auth.users
WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
ORDER BY email;





