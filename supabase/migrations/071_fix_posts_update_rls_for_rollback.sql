-- posts UPDATE policy を修正し、deleted=true ロールバックを許可する
--
-- 問題: posts.update({ deleted: true }) が RLS 403 / 42501 で失敗する
--   "new row violates row-level security policy for table posts"
--
-- 原因:
--   PostgREST は UPDATE 後の行に対して SELECT policy の USING 条件を
--   visibility check として適用する。既存の SELECT policy は deleted = FALSE を
--   要求するため、deleted=true に更新すると新行が SELECT 不可となりエラーになる。
--   また UPDATE policy に WITH CHECK が明示されておらず、USING 式が暗黙的に
--   WITH CHECK として使われる状態だった。
--
-- 修正:
--   1. UPDATE policy を DROP & 再作成し WITH CHECK を明示する
--      （author_id = auth.uid() のみ。deleted の値は問わない）
--   2. 投稿者が自分の投稿を常に SELECT できる policy を追加
--      （PostgREST の update 後 visibility check を通すため）
--
-- 影響範囲:
--   タイムライン取得クエリはアプリ側で .eq('deleted', false) を指定済みのため、
--   削除済み投稿が一般ユーザーのタイムラインに表示されることはない。

-- 1. 既存の UPDATE policy を削除し WITH CHECK を明示して再作成
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );

-- 2. 投稿者が自分の投稿を SELECT できる policy を追加（deleted 状態を問わない）
--    既存の SELECT policy "Users can view posts in their facilities" と
--    OR で評価される（permissive policy）ため、他スタッフへの影響はない。
CREATE POLICY "Authors can view their own posts"
  ON posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
  );
