-- ============================================
-- 確認3: アクティブな関連付けが残っていないことを確認
-- ============================================
-- この結果で active_count が 0 であれば正常です

SELECT 
  COUNT(*) AS active_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ 正常：アクティブな関連付けはありません'
    ELSE '⚠️ 警告：アクティブな関連付けが残っています'
  END AS message
FROM user_facility_roles ufr
WHERE ufr.user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
)
  AND ufr.deleted = false;






