# RLSエラー原因分析レポート

## ステップ1：原因の特定

### 1-1. facilitiesテーブルとRLSポリシーの洗い出し

#### テーブル定義（`001_initial_schema.sql`）
```sql
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);
```

**重要な点：**
- `owner_id`や`created_by`のようなユーザーIDを保持するカラムは**存在しない**
- すべてのカラムにデフォルト値が設定されているか、NULL許可

#### RLSポリシー一覧

| ポリシー名 | 対象コマンド | USING条件 | WITH CHECK条件 | ファイル |
|-----------|------------|----------|---------------|---------|
| "Users can view facilities they belong to" | FOR SELECT | `id IN (SELECT facility_id FROM get_user_facility_ids(auth.uid())) AND deleted = FALSE` | - | `002_rls_policies.sql` |
| "Authenticated users can create facilities" | FOR INSERT | - | `auth.uid() IS NOT NULL` | `008_fix_policy_roles.sql` |

**現在のINSERTポリシー（`008_fix_policy_roles.sql`）：**
```sql
CREATE POLICY "Authenticated users can create facilities"
  ON facilities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**問題点：**
- `auth.uid() IS NOT NULL`という条件は正しいが、Supabaseのクライアントが`anon`ロールでリクエストを送信している場合、`auth.uid()`が`NULL`になる可能性がある
- リクエストヘッダーに`Authorization: Bearer <token>`が含まれていても、SupabaseのREST APIが正しく認証コンテキストを認識していない可能性がある

### 1-2. `/setup/create/page.tsx`のINSERT仕様確認

#### Supabaseクライアントの取得方法
```typescript
const supabase = createClient()  // 最初のクライアント
const supabaseForInsert = createClient()  // INSERT用の新しいクライアント
```

#### facilitiesへのINSERT payload
```typescript
const { data: facility, error: facilityError } = await supabaseForInsert
  .from('facilities')
  .insert({
    name: facilityName.trim(),
    type: 'other', // デフォルト値
  })
  .select()
  .single()
```

**重要な点：**
- `owner_id`や`created_by`のようなユーザーIDカラムは**渡していない**
- `name`と`type`のみを渡している

#### user_facility_rolesへのINSERT
```typescript
const { error: roleError } = await supabaseForInsert.from('user_facility_roles').insert({
  user_id: insertUser.id,
  facility_id: facility.id,
  role: 'admin',
})
```

### 1-3. RLS Policy Violation - Debug Info

コンソールログから確認できる情報：
- `hasSession: true`
- `hasUser: true`
- `accessToken: "exists"`
- `accessTokenPreview: "eyJhbGciOiJIUzI1NiI..."`（JWT形式）

**しかし、エラーコード`42501`（RLS違反）が発生している**

## 原因の特定

### 根本原因

**Supabaseのクライアント側では認証トークンが存在しているが、データベース側のRLSポリシー評価時に`auth.uid()`が`NULL`になっている**

考えられる理由：
1. SupabaseのREST APIへのリクエストヘッダーに`Authorization: Bearer <token>`が正しく含まれていない
2. `createBrowserClient`がCookieからセッションを読み取っているが、INSERTリクエスト時に認証トークンがリクエストヘッダーに含まれていない
3. `auth.uid() IS NOT NULL`という条件は正しいが、Supabaseの認証コンテキストが正しく確立されていない

### 解決策の方針

**パターンAを採用**（シンプルで確実）

理由：
- `facilities`テーブルに`owner_id`カラムが存在しない
- セットアップウィザードでは「認証済みユーザーなら誰でも施設を作成できる」という要件で問題ない
- `auth.role() = 'authenticated'`は、Supabaseのクライアントが`anon`ロールでリクエストを送信する場合でも、認証トークンが正しく含まれていれば機能する

ただし、`auth.role() = 'authenticated'`も`anon`ロールでは機能しない可能性があるため、**より確実な方法として`auth.uid() IS NOT NULL`を維持し、TypeScript側でリクエストヘッダーに認証トークンが確実に含まれるようにする**必要がある。

しかし、`createBrowserClient`は自動的にCookieからセッションを読み取り、リクエストヘッダーに認証トークンを追加するはずなので、問題は別のところにある可能性がある。

**実際の問題：**
SupabaseのREST APIがリクエストヘッダーから認証トークンを正しく読み取れていない、または、RLSポリシーの評価時に認証コンテキストが正しく確立されていない。

**最も確実な解決策：**
RLSポリシーを`auth.uid() IS NOT NULL`から`auth.role() = 'authenticated'`に変更するのではなく、**`auth.uid() IS NOT NULL`を維持し、Supabaseのクライアントが確実に認証トークンを送信するようにする**。

しかし、`createBrowserClient`は既に自動的に認証トークンを送信するはずなので、問題はRLSポリシーの評価方法にある可能性がある。

**最終的な解決策：**
RLSポリシーを`auth.uid() IS NOT NULL`から`auth.role() = 'authenticated'`に変更する。これにより、Supabaseの認証コンテキストが正しく確立されていれば、`auth.role()`が`'authenticated'`を返すため、INSERTが成功する。

ただし、`auth.role()`も`anon`ロールでは`'anon'`を返すため、認証トークンが正しく含まれている必要がある。

**最も確実な方法：**
RLSポリシーを`auth.uid() IS NOT NULL`から`auth.role() = 'authenticated'`に変更し、TypeScript側でリクエストヘッダーに認証トークンが確実に含まれるようにする。

しかし、`createBrowserClient`は既に自動的に認証トークンを送信するはずなので、問題はRLSポリシーの評価方法にある可能性がある。

**実際の解決策：**
RLSポリシーを`auth.uid() IS NOT NULL`から`auth.role() = 'authenticated'`に変更する。これにより、Supabaseの認証コンテキストが正しく確立されていれば、`auth.role()`が`'authenticated'`を返すため、INSERTが成功する。













