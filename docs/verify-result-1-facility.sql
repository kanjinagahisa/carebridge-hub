-- ============================================
-- 確認1: 施設「RLS Policy Test」の削除状態
-- ============================================

SELECT 
  id, 
  name, 
  deleted, 
  updated_at,
  CASE 
    WHEN deleted = true THEN '✅ 削除済み'
    ELSE '⚠️ 削除されていません'
  END AS status
FROM facilities
WHERE name LIKE '%RLS Policy Test%';





