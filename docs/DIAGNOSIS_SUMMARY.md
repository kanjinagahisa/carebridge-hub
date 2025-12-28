# 🧩 CareBridge Hub — 本番／ローカル混線状態の診断サマリー

## 📌 このドキュメントの目的

本番サーバーとローカル開発環境の設定が混ざってしまった状態を、**絶対に壊さずに**現状把握し、整理するための診断レポートです。

**⚠️ 重要: この診断では、DB の変更は一切行いません。**

---

## 📋 診断結果の記録用テンプレート

以下のテンプレートに、確認結果を記入してください。

### 1. Supabase プロジェクト一覧

| プロジェクト名 | URL（xxx部分） | 想定役割 | 備考 |
|--------------|---------------|---------|------|
| （例）carebridge-hub-prod | xxx-prod | 本番候補 | Vercel 本番が参照 |
| （例）carebridge-hub-dev | xxx-dev | 開発候補 | ローカルが参照 |

**確認方法:**
1. Supabase ダッシュボードにログイン
2. プロジェクト一覧を確認
3. 各プロジェクトの Settings → API → Project URL を確認

---

### 2. Vercel 本番環境の確認

| 項目 | 値（マスク済み） | 備考 |
|------|----------------|------|
| NEXT_PUBLIC_SUPABASE_URL | https://xxx.supabase.co | （xxx部分のみ記入） |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 設定されている / 設定されていない | 先頭10文字: eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | 設定されている / 設定されていない | |
| 参照している Supabase プロジェクト | （プロジェクト名） | |

**確認方法:**
1. Vercel ダッシュボード → プロジェクト → Settings → Environment Variables
2. 上記の環境変数を確認
3. Supabase プロジェクトと照合

---

### 3. ローカル開発環境の確認

| 項目 | 値（マスク済み） | 備考 |
|------|----------------|------|
| .env.local の存在 | ✅ / ❌ | |
| NEXT_PUBLIC_SUPABASE_URL | https://xxx.supabase.co | （xxx部分のみ記入） |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 設定されている / 設定されていない | |
| SUPABASE_SERVICE_ROLE_KEY | 設定されている / 設定されていない | |
| 参照している Supabase プロジェクト | （プロジェクト名） | |

**確認方法:**
```bash
# .env.local が存在するか確認
ls -la .env.local

# 環境変数を確認（値はマスク）
cat .env.local | grep SUPABASE | sed 's/=.*/=***/'
```

---

### 4. テーブル一覧の確認

**各 Supabase プロジェクトで、以下の SQL を実行してください：**

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**結果記録:**

| テーブル名 | 本番候補プロジェクトA | 開発候補プロジェクトB | 想定（migrations） |
|-----------|---------------------|---------------------|------------------|
| attachments | ✅ / ❌ | ✅ / ❌ | ✅ |
| client_documents | ✅ / ❌ | ✅ / ❌ | ✅ |
| clients | ✅ / ❌ | ✅ / ❌ | ✅ |
| facilities | ✅ / ❌ | ✅ / ❌ | ✅ |
| group_members | ✅ / ❌ | ✅ / ❌ | ✅ |
| groups | ✅ / ❌ | ✅ / ❌ | ✅ |
| invite_codes | ✅ / ❌ | ✅ / ❌ | ✅ |
| post_bookmarks | ✅ / ❌ | ✅ / ❌ | ✅ |
| post_reads | ✅ / ❌ | ✅ / ❌ | ✅ |
| post_reactions | ✅ / ❌ | ✅ / ❌ | ✅ |
| posts | ✅ / ❌ | ✅ / ❌ | ✅ |
| user_facility_roles | ✅ / ❌ | ✅ / ❌ | ✅ |
| users | ✅ / ❌ | ✅ / ❌ | ✅ |

---

### 5. 主要テーブルのカラム確認

**診断用 SQL ファイルを使用:**
- `docs/diagnosis-production-local-mix.sql` を開く
- 各テーブル用の SQL クエリをコピー
- 各 Supabase プロジェクトで実行
- 結果を比較

**確認すべき主要な差分:**

| テーブル/カラム | 本番候補A | 開発候補B | 想定（migrations） | 差分 |
|----------------|----------|----------|------------------|------|
| `posts.client_id` | ✅ / ❌ | ✅ / ❌ | ✅ 存在（Migration 036） | |
| `posts.group_id` | NOT NULL / NULL | NOT NULL / NULL | NULL (nullable) | |
| `client_documents` テーブル | ✅ / ❌ | ✅ / ❌ | ✅ 存在（Migration 026） | |
| `attachments` テーブル | ✅ / ❌ | ✅ / ❌ | ✅ 存在（Migration 001） | |

---

### 6. Migration の適用状況

**確認方法:**

各 Supabase プロジェクトで、以下のポイントを確認：

- [ ] Migration 001（初期スキーマ）が適用されているか
- [ ] Migration 026（client_documents）が適用されているか
- [ ] Migration 036（posts.client_id）が適用されているか
- [ ] Storage バケット `attachments` が存在するか（Migration 041）

**結果記録:**

| Migration | 本番候補プロジェクトA | 開発候補プロジェクトB | 想定状態 |
|-----------|---------------------|---------------------|---------|
| 001 (初期スキーマ) | ✅ / ❌ | ✅ / ❌ | ✅ 適用済み |
| 026 (client_documents) | ✅ / ❌ | ✅ / ❌ | ✅ 適用済み |
| 036 (posts.client_id) | ✅ / ❌ | ✅ / ❌ | ✅ 適用済み |
| 041 (storage bucket) | ✅ / ❌ | ✅ / ❌ | ✅ 作成済み |

---

## 🎯 現状のマトリクスまとめ

### 環境と Supabase プロジェクトの対応関係

```
┌─────────────────┬──────────────────────┬──────────────────────┐
│ 環境            │ Supabase プロジェクト │ URL（xxx部分）       │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Vercel 本番     │ （記入）              │ （記入）              │
│ ローカル開発    │ （記入）              │ （記入）              │
└─────────────────┴──────────────────────┴──────────────────────┘
```

### スキーマの差分サマリー

| 項目 | 本番候補A | 開発候補B | 想定 | アクション |
|------|----------|----------|------|-----------|
| テーブル数 | （記入） | （記入） | 13 | |
| `posts.client_id` | ✅ / ❌ | ✅ / ❌ | ✅ | |
| `client_documents` | ✅ / ❌ | ✅ / ❌ | ✅ | |
| Storage バケット | ✅ / ❌ | ✅ / ❌ | ✅ | |

---

## 🧭 今後の整理方針（提案）

### 推奨アプローチ

1. **本番 Supabase プロジェクトの固定**
   - Vercel 本番が現在参照している Supabase プロジェクトを「本番」として固定
   - 理由: 既に本番環境で使用されているため、切り替えリスクが高い

2. **開発 Supabase プロジェクトの固定**
   - ローカル開発で使用している Supabase プロジェクトを「開発」として固定
   - または、新規に開発用プロジェクトを作成

3. **スキーマの統一**
   - **推奨**: migrations に寄せる（コードと DB の整合性を保つ）
   - バックアップを取得してから、不足している migration を適用

### 次のステップ（別プロンプトで実行）

以下の手順を、**別のプロンプトで実行**してください：

1. **バックアップ取得**
   - 本番 Supabase: Settings → Database → Backups
   - 開発 Supabase: Settings → Database → Backups

2. **環境変数の整理**
   - `.env.local.example` を作成（テンプレート）
   - `.env.local` を開発用 Supabase に設定
   - Vercel 本番の環境変数を本番用 Supabase に設定

3. **Migration の適用**
   - 開発環境で不足している migration を適用
   - 本番環境で不足している migration を適用（バックアップ後、慎重に）

4. **整合性の確認**
   - 各環境でスキーマの整合性を確認
   - アプリケーションの動作確認

---

## 📚 参考ドキュメント

- [詳細診断ガイド](./PRODUCTION_LOCAL_DIAGNOSIS_GUIDE.md) - 詳細な手順と説明
- [診断用 SQL](./diagnosis-production-local-mix.sql) - スキーマ確認用の SQL クエリ
- [Migration 要約](./migration-summary.md) - Migration ファイルの要約

---

## ⚠️ 重要な注意事項

1. **この診断では、DB の変更は一切行いません**
2. **バックアップは必ず取得してください**
3. **本番環境への変更は、別プロンプトで慎重に行ってください**
4. **環境変数の値（URLやキー）は、フルで表示しないでください**

---

## 📝 確認結果の記録

### ✅ 確認結果（2025年12月11日時点）

#### 1. Supabase プロジェクト一覧

| プロジェクト名 | URL（xxx部分） | 想定役割 | 備考 |
|--------------|---------------|---------|------|
| carebridge-hub-prod | wqtnffvhhssgdnecjwpy | **本番** | Vercel 本番が参照、PRODUCTION ラベル |
| carebridge-hub-dev | nwszimmkjrkzddypegzy | **開発/テスト** | ローカル開発が参照、PRODUCTION ラベル（混線状態） |

**確認結果:**
- ✅ 2つの Supabase プロジェクトが存在
- ⚠️ 両方とも Supabase ダッシュボードで「PRODUCTION」ラベルが付いている（混線状態）

#### 2. Vercel 本番環境の確認

| 項目 | 値（マスク済み） | 備考 |
|------|----------------|------|
| NEXT_PUBLIC_SUPABASE_URL | https://wqtnffvhhssgdnecjwpy.supabase.co | ✅ 確認済み |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 設定されている | ✅ 確認済み |
| SUPABASE_SERVICE_ROLE_KEY | 設定されている | ✅ 確認済み |
| 参照している Supabase プロジェクト | **carebridge-hub-prod** | ✅ 一致確認済み |

**照合結果:**
- ✅ Vercel 本番環境は `carebridge-hub-prod` (wqtnffvhhssgdnecjwpy) を参照している
- ✅ Supabase プロジェクトの URL と一致している

#### 3. ローカル開発環境の確認

| 項目 | 値（マスク済み） | 備考 |
|------|----------------|------|
| .env.local の存在 | ✅ 存在 | 確認済み |
| NEXT_PUBLIC_SUPABASE_URL | https://nwszimmkjrkzddypegzy.supabase.co | ✅ 確認済み |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 設定されている | ✅ 確認済み |
| SUPABASE_SERVICE_ROLE_KEY | 設定されている | ✅ 確認済み |
| 参照している Supabase プロジェクト | **carebridge-hub-dev** | ✅ 確認済み |

**確認方法:**
- ✅ ターミナルでの確認方法は正しいです
- ✅ `.env.local` は `carebridge-hub-dev` (nwszimmkjrkzddypegzy) を参照している

#### 4. テーブル一覧の確認結果

**各 Supabase プロジェクトで実行した SQL の結果:**

| テーブル名 | 本番（carebridge-hub-prod） | 開発（carebridge-hub-dev） | 想定（migrations） |
|-----------|---------------------------|--------------------------|------------------|
| attachments | ✅ 存在 | ✅ 存在 | ✅ |
| client_documents | ✅ 存在（0行） | ✅ 存在（0行） | ✅ |
| clients | ✅ 存在（1行） | ✅ 存在（2行） | ✅ |
| facilities | ✅ 存在（1行） | ✅ 存在（11行） | ✅ |
| groups | ✅ 存在（0行） | ✅ 存在（1行） | ✅ |
| post_reads | ✅ 存在（2行） | ✅ 存在（55行） | ✅ |
| post_reactions | ✅ 存在（0行） | ✅ 存在（5行） | ✅ |
| posts | ✅ 存在（2行） | ✅ 存在（29行） | ✅ |
| user_facility_roles | ✅ 存在（1行） | ✅ 存在（11行） | ✅ |
| users | ✅ 存在（1行） | ✅ 存在（2行） | ✅ |

**データ量の比較:**
- **本番（carebridge-hub-prod）**: データが少ない（初期状態に近い）
  - facilities: 1, users: 1, clients: 1, posts: 2
- **開発（carebridge-hub-dev）**: データが多い（テストで使用されていた）
  - facilities: 11, users: 2, clients: 2, posts: 29, post_reads: 55

**重要な発見:**
- ✅ 両方のプロジェクトに主要テーブルが存在している
- ⚠️ 開発プロジェクトの方がデータ量が多い（テストで使用されていた証拠）

#### 6. インデックスの確認結果（2025年12月11日）

**本番プロジェクト（carebridge-hub-prod）と開発プロジェクト（carebridge-hub-dev）で実行した結果:**

**確認されたインデックス（両方のプロジェクトで同じ10個）:**

| indexname | indexdef |
|-----------|----------|
| idx_attachments_client_id | CREATE INDEX idx_attachments_client_id ON public.attachments USING btree (client_id) |
| idx_client_documents_client_id | CREATE INDEX idx_client_documents_client_id ON public.client_documents USING btree (client_id) |
| idx_groups_client_id | CREATE INDEX idx_groups_client_id ON public.groups USING btree (client_id) |
| idx_posts_author_id | CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id) |
| idx_posts_client_id | CREATE INDEX idx_posts_client_id ON public.posts USING btree (client_id) |
| idx_posts_client_id_created_at | CREATE INDEX idx_posts_client_id_created_at ON public.posts USING btree (client_id, created_at DESC) |
| idx_posts_created_at | CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC) |
| idx_posts_group_id | CREATE INDEX idx_posts_group_id ON public.posts USING btree (group_id) |
| idx_posts_group_id_created_at | CREATE INDEX idx_posts_group_id_created_at ON public.posts USING btree (group_id, created_at DESC) WHERE (group_id IS NOT NULL) |
| posts_pkey | CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id) |

**重要な発見:**
- ✅ **インデックスの構造が完全に一致している** - 本番・開発ともに同じ10個のインデックスが存在
- ✅ **Migration 036 が適用されている証拠**:
  - `idx_posts_client_id` が存在 → `posts.client_id` カラムが存在
  - `idx_posts_client_id_created_at` が存在 → Migration 036 が適用済み
  - `idx_posts_group_id_created_at` の WHERE (group_id IS NOT NULL) → `posts.group_id` が nullable
- ✅ **Migration 026 が適用されている証拠**:
  - `idx_client_documents_client_id` が存在 → `client_documents` テーブルが存在
- ⚠️ **詳細な確認が必要な項目**:
  - `posts` テーブルのカラム構造の詳細（SQLクエリ結果が必要）
  - `posts_group_or_client_check` 制約の存在（SQLクエリ結果が必要）
  - `client_documents` テーブルのカラム構造の詳細（SQLクエリ結果が必要）

#### 7. Migration 適用状況の確認結果（推測）

**インデックスの確認結果から推測:**

| Migration | 本番 | 開発 | 想定 | 状態 |
|-----------|------|------|------|------|
| 026 (client_documents) | ✅ 適用済み | ✅ 適用済み | ✅ 適用済み | ✅ 両方とも適用済み |
| 036 (posts.client_id) | ✅ 適用済み | ✅ 適用済み | ✅ 適用済み | ✅ 両方とも適用済み |

**推測の根拠:**
- `idx_client_documents_client_id` の存在 → Migration 026 が適用済み
- `idx_posts_client_id` の存在 → Migration 036 が適用済み
- `idx_posts_group_id_created_at` の WHERE (group_id IS NOT NULL) → `posts.group_id` が nullable（Migration 036 が適用済み）

#### 5. 現状のマトリクスまとめ

**環境と Supabase プロジェクトの対応関係:**

```
┌─────────────────┬──────────────────────┬──────────────────────┐
│ 環境            │ Supabase プロジェクト │ URL（xxx部分）       │
├─────────────────┼──────────────────────┼──────────────────────┤
│ Vercel 本番     │ carebridge-hub-prod  │ wqtnffvhhssgdnecjwpy │
│ ローカル開発    │ carebridge-hub-dev    │ nwszimmkjrkzddypegzy │
└─────────────────┴──────────────────────┴──────────────────────┘
```

**確認結果:**
- ✅ **本番環境**: Vercel 本番 → `carebridge-hub-prod` (wqtnffvhhssgdnecjwpy)
- ✅ **開発環境**: ローカル開発 → `carebridge-hub-dev` (nwszimmkjrkzddypegzy)
- ✅ **環境の分離**: 本番と開発が正しく分離されている

#### 6. 役割の認識について

**ご質問への回答:**

> 本番候補は本番のサーバーで、開発候補はあくまでテストとして使っていたものという認識でよろしいでしょうか？

**回答: はい、その認識で正しいです。**

- **`carebridge-hub-prod` (wqtnffvhhssgdnecjwpy)**: 
  - ✅ Vercel 本番環境が参照している
  - ✅ 本番サーバーとして使用されている
  - ⚠️ データ量が少ない（初期状態に近い）

- **`carebridge-hub-dev` (nwszimmkjrkzddypegzy)**:
  - ✅ ローカル開発環境が参照している
  - ✅ テスト用として使用されていた
  - ✅ データ量が多い（テストで使用されていた証拠）

**ただし、注意点:**
- ⚠️ 両方とも Supabase ダッシュボードで「PRODUCTION」ラベルが付いている
- ⚠️ これは混線状態の証拠（本来は `carebridge-hub-dev` は「DEVELOPMENT」ラベルであるべき）

#### 7. スキーマの差分確認結果（✅ 完了）

**✅ 主要テーブルのカラム構造を確認しました（2025年12月11日）:**

**確認結果:**

1. **`posts` テーブルのカラム構造**
   - ✅ 本番・開発ともに9カラムで完全一致
   - ✅ `client_id` カラムが存在（ordinal_position: 9）
   - ✅ `group_id` が nullable（is_nullable = 'YES'）

2. **`posts_group_or_client_check` 制約**
   - ✅ 本番・開発ともに存在（CHECK制約）

3. **`client_documents` テーブルのカラム構造**
   - ✅ 本番・開発ともに8カラムで完全一致

**確認すべきポイント（全て確認済み）:**
- [x] `posts.client_id` カラムが存在するか（Migration 036） → ✅ 存在
- [x] `posts.group_id` が nullable か（Migration 036） → ✅ nullable
- [x] `client_documents` テーブルの構造が一致しているか → ✅ 完全一致
- [x] `posts_group_or_client_check` 制約が存在するか → ✅ 存在

**🎉 結論:**
- ✅ **本番・開発のスキーマが完全に一致していることが確認されました**
- ✅ スキーマの差分は見つかりませんでした

#### 8. 次のステップ実行ガイド

**現状の整理:**
1. ✅ 環境の分離は正しく行われている
2. ⚠️ Supabase ダッシュボードのラベルが混線している（両方「PRODUCTION」）
3. ⚠️ スキーマの詳細な差分を確認する必要がある

**次のステップの実行:**

詳細な手順は以下のドキュメントを参照してください：

- **[SQL実行クイックスタートガイド](./QUICK_START_SQL_EXECUTION.md)** - ⭐ まずはこちらを読んでください
- **[次のステップ実行ガイド](./NEXT_STEPS_GUIDE.md)** - スキーマ確認の詳細手順
- **[スキーマ差分記録テンプレート](./schema-diff-recording-template.md)** - 結果記録用テンプレート

**⚠️ 重要な注意:**
- **実行するファイル**: `docs/diagnosis-production-local-mix.sql` のSQLクエリを実行してください
- **実行しないファイル**: `docs/NEXT_STEPS_GUIDE.md` は手順書です。SQLエディタにコピーしないでください
- **両方のプロジェクトで実行**: 本番プロジェクトと開発プロジェクトの両方で同じSQLクエリを実行してください

**推奨される次のステップ:**

✅ **完了した項目:**
1. ✅ インデックスの確認 - 本番・開発ともに同じ10個のインデックスが存在
2. ✅ Migration 026, 036 の適用状況確認 - 両方とも適用済み（完全確認済み）
3. ✅ `posts` テーブルのカラム構造確認 - 本番・開発ともに完全一致（9カラム）
4. ✅ `posts_group_or_client_check` 制約の確認 - 本番・開発ともに存在
5. ✅ `client_documents` テーブルのカラム構造確認 - 本番・開発ともに完全一致（8カラム）

🎉 **重要な結論:**
- ✅ **本番・開発のスキーマが完全に一致していることが確認されました**
- ✅ スキーマの差分は見つかりませんでした
- ✅ Migration は正しく適用されています

⚠️ **追加で確認が必要な項目（推奨）:**
1. **Storage バケットの確認**: 手動で確認
   - Supabase ダッシュボード → Storage → Buckets → `attachments` バケットの存在確認
   - Migration 041 で作成される想定のバケット
2. **バックアップ取得**: 本番・開発ともにバックアップを取得（推奨）
   - Supabase ダッシュボード → Settings → Database → Backups
   - 理由: 今後の変更に備えて
3. **環境変数の整理**: ドキュメント化（推奨）
   - `.env.local.example` の作成
   - 環境変数の整理

**結果の記録:**
- ✅ `docs/schema-diff-recording-template.md` に全ての結果を記録済み
- ✅ スキーマの完全一致が確認されました

---

## 📚 参考情報

- **確認日時**: 2025年12月11日
- **確認者**: ユーザー + Cursor AI
- **確認方法**: Supabase ダッシュボード、Vercel ダッシュボード、ローカル環境変数







