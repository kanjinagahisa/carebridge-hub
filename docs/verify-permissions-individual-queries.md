# 018_verify_permissions.sql の各クエリを個別に確認する方法

`018_verify_permissions.sql` には3つのクエリが含まれていますが、Supabase の SQL Editor では複数のクエリを一度に実行すると、通常は最後のクエリの結果だけが表示されます。

各クエリの結果を個別に確認するには、各クエリを個別に実行する必要があります。

---

## 確認方法

### 方法 1: 各クエリを個別に実行（推奨）

#### ステップ 1: スキーマ権限の確認

1. Supabase の SQL Editor で **"New query"** をクリック（新しいクエリタブを開く）
2. 以下のクエリをコピー&ペースト：

```sql
-- Check schema permissions
SELECT 
  nspname as schema_name,
  rolname as role_name,
  has_schema_privilege(rolname, nspname, 'USAGE') as has_usage
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE nspname = 'public' 
  AND rolname IN ('anon', 'authenticated')
ORDER BY schema_name, role_name;
```

3. **"Run"** をクリック
4. **期待される結果**:
   - 2行が返される
   - `schema_name`: `public`
   - `role_name`: `anon` と `authenticated`
   - `has_usage`: 両方とも `true` が表示される

#### ステップ 2: facilities テーブルの権限確認

1. 同じクエリタブで、クエリを削除
2. 以下のクエリをコピー&ペースト：

```sql
-- Check table permissions for facilities
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'facilities'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
```

3. **"Run"** をクリック
4. **期待される結果**:
   - 複数行が返される（少なくとも4行以上）
   - `table_schema`: `public`
   - `table_name`: `facilities`
   - `grantee`: `anon` と `authenticated`
   - `privilege_type`: 以下の権限が含まれることを確認：
     - `INSERT` ✅（必須）
     - `SELECT` ✅（必須）
     - その他の権限（`DELETE`, `UPDATE`, `REFERENCES`, `TRIGGER`, `TRUNCATE` など）も表示される場合があります

#### ステップ 3: user_facility_roles テーブルの権限確認（既に確認済み）

このクエリの結果は既に確認済みです。念のため、再度確認する場合は：

1. 同じクエリタブで、クエリを削除
2. 以下のクエリをコピー&ペースト：

```sql
-- Check table permissions for user_facility_roles
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'user_facility_roles'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
```

3. **"Run"** をクリック
4. **期待される結果**:
   - 14行が返される（既に確認済み）
   - `INSERT` と `SELECT` 権限が `anon` と `authenticated` の両方に付与されていることを確認

---

### 方法 2: クエリを分割して実行

`018_verify_permissions.sql` の内容を3つのファイルに分割して、それぞれを個別に実行することもできます。

---

## 確認チェックリスト

以下の項目を確認し、チェックを入れてください：

### スキーマ権限
- [ ] `anon` ロールに `public` スキーマの `USAGE` 権限が付与されている（`has_usage: true`）
- [ ] `authenticated` ロールに `public` スキーマの `USAGE` 権限が付与されている（`has_usage: true`）

### facilities テーブルの権限
- [ ] `anon` ロールに `INSERT` 権限が付与されている
- [ ] `anon` ロールに `SELECT` 権限が付与されている
- [ ] `authenticated` ロールに `INSERT` 権限が付与されている
- [ ] `authenticated` ロールに `SELECT` 権限が付与されている

### user_facility_roles テーブルの権限（既に確認済み）
- [ ] `anon` ロールに `INSERT` 権限が付与されている ✅
- [ ] `anon` ロールに `SELECT` 権限が付与されている ✅
- [ ] `authenticated` ロールに `INSERT` 権限が付与されている ✅
- [ ] `authenticated` ロールに `SELECT` 権限が付与されている ✅

---

## 問題がある場合の対処

### スキーマ権限が不足している場合

以下のクエリを実行して権限を付与：

```sql
-- Grant usage on public schema to anon role
GRANT USAGE ON SCHEMA public TO anon;

-- Grant usage on public schema to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
```

### facilities テーブルの権限が不足している場合

以下のクエリを実行して権限を付与：

```sql
-- Grant permissions to anon role
GRANT INSERT ON TABLE facilities TO anon;
GRANT SELECT ON TABLE facilities TO anon;

-- Grant permissions to authenticated role
GRANT INSERT ON TABLE facilities TO authenticated;
GRANT SELECT ON TABLE facilities TO authenticated;
```

---

## 次のステップ

すべての権限が正しく付与されていることを確認したら、次のマイグレーション `019_fix_facility_insert_policy_using_service_role.sql` に進んでください。









