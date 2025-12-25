-- ============================================
-- 確認2: 指定ユーザーの関連付け状態
-- ============================================

SELECT 
  au.email,
  f.name AS facility_name,
  ufr.role,
  CASE 
    WHEN ufr.deleted = true THEN '✅ 削除済み'
    ELSE '⚠️ アクティブ（削除されていません）'
  END AS status,
  ufr.created_at,
  ufr.updated_at AS deleted_at
FROM auth.users au
JOIN user_facility_roles ufr ON ufr.user_id = au.id
JOIN facilities f ON f.id = ufr.facility_id
WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
ORDER BY ufr.deleted DESC, f.name;





