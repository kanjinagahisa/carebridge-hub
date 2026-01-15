# 次のステップ実行ガイド

このガイドは、スキーマの詳細確認と Migration 適用状況の確認を行うための手順書です。

## ⚠️ 重要な注意事項

**このファイル（NEXT_STEPS_GUIDE.md）は手順書です。SQLエディタにコピーして実行しないでください。**

**実行すべきSQLファイル:**
- ✅ `docs/diagnosis-production-local-mix.sql` - このファイルのSQLクエリを実行してください
- ❌ `docs/NEXT_STEPS_GUIDE.md` - これは手順書です。実行しないでください

**エラーが発生した場合:**
- `syntax error at or near "#"` というエラーが出た場合、間違ったファイルをコピーしています
- `docs/diagnosis-production-local-mix.sql` の内容をコピーしてください

## 📋 実行手順

### 🔍 確認の目的

**本番プロジェクトと開発プロジェクトの両方で実行する必要があります。**

スキーマの差分を確認するため、以下の2つのプロジェクトで同じSQLクエリを実行してください：

1. **本番プロジェクト**: `carebridge-hub-prod` (wqtnffvhhssgdnecjwpy)
2. **開発プロジェクト**: `carebridge-hub-dev` (nwszimmkjrkzddypegzy)

**実行するSQLファイル:**
- `docs/diagnosis-production-local-mix.sql` を開く
- このファイルに含まれるSQLクエリをコピーして実行

### ステップ1: スキーマの詳細確認

#### 1-1. 本番プロジェクト（carebridge-hub-prod）での確認

**⚠️ 重要: 以下の手順で `docs/diagnosis-production-local-mix.sql` のSQLクエリを実行してください**

1. Supabase ダッシュボードにログイン
2. `carebridge-hub-prod` プロジェクトを選択（URL: `wqtnffvhhssgdnecjwpy`）
3. 左メニュー → 「SQL Editor」を開く
4. 「New Query」をクリック
5. **`docs/diagnosis-production-local-mix.sql` ファイルを開く**（このファイルです）
6. **このファイルに含まれるSQLクエリをコピーして、Supabase SQL Editorに貼り付けて実行**
7. 結果をコピーして保存

**実行するクエリの例（`docs/diagnosis-production-local-mix.sql` から）:**

**実行するクエリ（順番に）:**

1. **posts テーブルのカラム構造確認**
   ```sql
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
   ```

2. **posts.client_id カラムの存在確認**
   ```sql
   SELECT 
     column_name,
     data_type,
     is_nullable,
     column_default
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'posts'
     AND column_name = 'client_id';
   ```

3. **posts.group_id が nullable か確認**
   ```sql
   SELECT 
     column_name,
     is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'posts'
     AND column_name = 'group_id';
   ```

4. **posts テーブルの制約確認**
   ```sql
   SELECT 
     constraint_name,
     constraint_type,
     table_name
   FROM information_schema.table_constraints
   WHERE table_schema = 'public'
     AND table_name = 'posts'
     AND constraint_name LIKE '%group_or_client%';
   ```

5. **client_documents テーブルのカラム構造確認**
   ```sql
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
   ```

6. **Migration 適用状況の確認**
   ```sql
   -- client_documents テーブルの存在確認
   SELECT 
     CASE 
       WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'client_documents'
       ) THEN '✅ 存在'
       ELSE '❌ 不存在'
     END as client_documents_table_status;

   -- posts.client_id カラムの存在確認
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

   -- posts.group_id が nullable か確認
   SELECT 
     CASE 
       WHEN is_nullable = 'YES' THEN '✅ nullable（Migration 036 適用済み）'
       ELSE '❌ NOT NULL（Migration 036 未適用）'
     END as posts_group_id_nullable_status
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'posts'
     AND column_name = 'group_id';
   ```

7. **インデックスの確認**
   ```sql
   SELECT 
     indexname,
     indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'posts'
   ORDER BY indexname;
   ```

#### 1-2. 開発プロジェクト（carebridge-hub-dev）での確認

**⚠️ 重要: 本番プロジェクトと同じSQLクエリを実行してください**

1. Supabase ダッシュボードで `carebridge-hub-dev` プロジェクトを選択（URL: `nwszimmkjrkzddypegzy`）
2. 左メニュー → 「SQL Editor」を開く
3. 「New Query」をクリック
4. **`docs/diagnosis-production-local-mix.sql` ファイルを開く**（本番と同じファイル）
5. **同じSQLクエリをコピーして、Supabase SQL Editorに貼り付けて実行**
6. 結果をコピーして保存

**注意:**
- 本番プロジェクトと開発プロジェクトで**同じSQLクエリ**を実行します
- 結果を比較して差分を確認します

#### 1-3. 結果の記録

1. `docs/schema-diff-recording-template.md` を開く
2. 各セクションに結果を記録
3. 差分を確認

---

### ステップ2: Storage バケットの確認

#### 2-1. 本番プロジェクト（carebridge-hub-prod）

1. Supabase ダッシュボード → `carebridge-hub-prod` プロジェクト
2. 左メニュー → 「Storage」を開く
3. 「Buckets」タブを確認
4. `attachments` バケットが存在するか確認
5. バケットの設定（Public/Private）を確認

#### 2-2. 開発プロジェクト（carebridge-hub-dev）

1. 上記と同じ手順で確認

#### 2-3. 結果の記録

- `docs/schema-diff-recording-template.md` の「6. Storage バケットの確認」セクションに記録

---

### ステップ3: バックアップの取得

#### 3-1. 本番プロジェクト（carebridge-hub-prod）

1. Supabase ダッシュボード → `carebridge-hub-prod` プロジェクト
2. 左メニュー → 「Settings」→「Database」
3. 「Backups」セクションを確認
4. 手動バックアップを作成（可能な場合）
5. または、自動バックアップの設定を確認

**⚠️ 重要: 本番環境のバックアップは必須です**

#### 3-2. 開発プロジェクト（carebridge-hub-dev）

1. 上記と同じ手順で確認
2. バックアップを作成（推奨）

---

### ステップ4: 結果の分析と次のアクションの決定

#### 4-1. 差分の確認

`docs/schema-diff-recording-template.md` に記録した結果を分析：

1. **Migration 026 の適用状況**
   - `client_documents` テーブルが両方のプロジェクトに存在するか
   - カラム構造が一致しているか

2. **Migration 036 の適用状況**
   - `posts.client_id` カラムが両方のプロジェクトに存在するか
   - `posts.group_id` が nullable か
   - `posts_group_or_client_check` 制約が存在するか

3. **Storage バケット**
   - `attachments` バケットが両方のプロジェクトに存在するか

#### 4-2. 次のアクションの決定

**もし差分が見つかった場合:**

1. **バックアップ取得**（必須）
   - 本番・開発ともにバックアップを取得

2. **Migration の適用**
   - 不足している migration を適用
   - 本番環境への適用は慎重に（バックアップ後）

3. **整合性の確認**
   - 各環境でスキーマの整合性を確認
   - アプリケーションの動作確認

**もし差分が見つからなかった場合:**

1. ✅ スキーマは一致している
2. 次のステップ: 環境変数の整理とドキュメント化

---

## 📝 チェックリスト

### 本番プロジェクト（carebridge-hub-prod）

- [ ] posts テーブルのカラム構造を確認
- [ ] posts.client_id カラムの存在を確認
- [ ] posts.group_id が nullable か確認
- [ ] posts テーブルの制約を確認
- [ ] client_documents テーブルのカラム構造を確認
- [ ] Migration 適用状況を確認
- [ ] インデックスを確認
- [ ] Storage バケットを確認
- [ ] バックアップを取得

### 開発プロジェクト（carebridge-hub-dev）

- [ ] posts テーブルのカラム構造を確認
- [ ] posts.client_id カラムの存在を確認
- [ ] posts.group_id が nullable か確認
- [ ] posts テーブルの制約を確認
- [ ] client_documents テーブルのカラム構造を確認
- [ ] Migration 適用状況を確認
- [ ] インデックスを確認
- [ ] Storage バケットを確認
- [ ] バックアップを取得

### 結果の記録

- [ ] `docs/schema-diff-recording-template.md` に結果を記録
- [ ] 差分を分析
- [ ] 次のアクションを決定

---

## ⚠️ 重要な注意事項

1. **このステップでは、DB の変更は一切行いません**
2. **バックアップは必ず取得してください**
3. **本番環境への変更は、別プロンプトで慎重に行ってください**
4. **結果は必ず記録してください**

---

## 📚 参考ドキュメント

- [診断用 SQL](./diagnosis-production-local-mix.sql) - スキーマ確認用の SQL クエリ
- [スキーマ差分記録テンプレート](./schema-diff-recording-template.md) - 結果記録用テンプレート
- [Migration 要約](./migration-summary.md) - Migration ファイルの要約
- [診断サマリー](./DIAGNOSIS_SUMMARY.md) - 診断結果のサマリー







