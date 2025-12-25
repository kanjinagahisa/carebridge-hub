# 🧩 CareBridge Hub — 本番DBバックアップ（無料プラン対応）手順（pg_dump推奨）

## 📋 このガイドの目的

Supabase無料プランで自動バックアップが使えないため、本番(`carebridge-hub-prod`)にDB変更（notifications/trigger等）を入れる前に、**"復元できるバックアップ"**を確実に作るための手順です。

---

## 🔑 データベースパスワードはいつ使う？

データベースパスワードは、**`pg_dump`コマンドでバックアップを作成する際**に使用します。

### 使用タイミング

1. **ステップ1で接続情報を取得**
   - Supabaseダッシュボードから接続文字列とパスワードを確認/取得します
   - この時点では、パスワードを**確認するだけ**です（まだ使用しません）

2. **ステップ2でバックアップを作成する際に使用**
   - `pg_dump`コマンドを実行する前に、環境変数`PGPASSWORD`にパスワードを設定します
   - `pg_dump`コマンドがSupabaseのデータベースに接続する際に、このパスワードが自動的に使用されます

### 具体的な使用箇所

```bash
# ステップ2-2: 環境変数でパスワードを設定
export PGPASSWORD='(DB_PASSWORD)'

# ステップ2-3: pg_dumpコマンドを実行（この時、上記の環境変数からパスワードが読み込まれる）
pg_dump \
  --host=db.xxxxx.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**重要：**
- `pg_dump`コマンドには`--password`オプションは**指定しません**
- 代わりに、環境変数`PGPASSWORD`に設定したパスワードが自動的に使用されます
- これにより、パスワードがコマンド履歴に残りにくくなります

### パスワードが必要な理由

Supabaseのデータベースは認証が必要なため、`pg_dump`で接続する際に：
- **ユーザー名**（`postgres`）
- **パスワード**（環境変数`PGPASSWORD`から取得）
- **ホスト**（`db.xxxxx.supabase.co`）
- **ポート**（`5432`）
- **データベース名**（`postgres`）

これらの情報を使って認証し、バックアップを作成します。

---

## ⚠️ 絶対ルール

- **ここではDBスキーマ変更をしない（DDL禁止）**
- **本番のキー/パスワードはログやファイルに平文で残さない**（必要ならローカル環境変数で扱う）
- **作業は「ローカルPC（開発者端末）」で行う**（Cursorは手順整理＆コマンド提示まで）

---

## ✅ 0) 事前準備（ローカルPC）

### PostgreSQLクライアントのインストール

macOS想定。PostgreSQLクライアントを入れる（未導入なら）

#### ステップ1: Homebrewがインストールされているか確認

```bash
brew --version
```

Homebrewがインストールされていない場合は、先にHomebrewをインストールしてください：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### ステップ2: PostgreSQLクライアントをインストール

```bash
brew install postgresql@16
```

**インストールの確認：**
インストールが完了したら、以下で確認：

```bash
# インストールされたか確認
brew list | grep postgresql
```

`postgresql@16` が表示されれば、インストール成功です。

#### ステップ3: パスを通す

インストール後、パスを通す必要があります：

**一時的にパスを通す（現在のターミナルセッションのみ）：**
```bash
# Apple Silicon Macの場合
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Intel Macの場合
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
```

**永続的にパスを通す：**
`~/.zshrc` ファイルに以下を追加：

```bash
# PostgreSQL 16（Apple Silicon Macの場合）
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# PostgreSQL 16（Intel Macの場合）
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
```

追加後、設定を反映：
```bash
source ~/.zshrc
```

#### ステップ4: 正常に動作するか確認

```bash
pg_dump --version
```

正常にインストールされていれば、バージョン情報が表示されます（例：`pg_dump (PostgreSQL) 16.x`）。

**エラーが出る場合：**
`zsh: command not found: pg_dump` というエラーが出る場合は、下記の「⚠️ `pg_dump`が見つからない場合の対処法」を参照してください。

### ⚠️ `pg_dump`が見つからない場合の対処法

`pg_dump --version` を実行して `zsh: command not found: pg_dump` または `zsh: no such file or directory: /opt/homebrew/opt/postgresql@16/bin/pg_dump` というエラーが出る場合、以下の対処を行ってください。

**🔍 まず確認：PostgreSQLがインストールされているか**

以下のコマンドで確認してください：

```bash
brew list | grep postgresql
```

**結果の見方：**
- **何も表示されない場合** → PostgreSQLがインストールされていません。下記の「対処A: PostgreSQLをインストールする」を実行してください。
- **`postgresql@16` などが表示される場合** → インストールされていますが、パスが通っていない可能性があります。下記の「対処1: HomebrewでインストールしたPostgreSQLのパスを通す」を実行してください。

#### 対処A: PostgreSQLをインストールする（インストールされていない場合）

**ステップ1: Homebrewがインストールされているか確認**

```bash
brew --version
```

Homebrewがインストールされていない場合は、先にHomebrewをインストールしてください：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**ステップ2: PostgreSQLクライアントをインストール**

```bash
brew install postgresql@16
```

インストールには数分かかります。完了するまで待ってください。

**ステップ3: インストールの確認**

```bash
brew list | grep postgresql
```

`postgresql@16` が表示されれば、インストール成功です。

**ステップ4: 実際の`pg_dump`のパスを確認**

インストール後、実際の`pg_dump`のパスを確認します：

```bash
# 実際のパスを確認
find /opt/homebrew -name pg_dump 2>/dev/null
# または（Intel Macの場合）
find /usr/local -name pg_dump 2>/dev/null
```

**期待される結果：**
- Apple Silicon Mac: `/opt/homebrew/Cellar/postgresql@16/16.11/bin/pg_dump` など
- Intel Mac: `/usr/local/Cellar/postgresql@16/16.11/bin/pg_dump` など

**または、Homebrewのシンボリックリンクを確認：**
```bash
# Apple Silicon Macの場合
ls -la /opt/homebrew/opt/postgresql@16/bin/pg_dump

# Intel Macの場合
ls -la /usr/local/opt/postgresql@16/bin/pg_dump
```

シンボリックリンクが存在する場合は、これを使用できます。

**ステップ5: パスを通す**

インストール後、パスを通す必要があります：

**⚠️ 重要：** コメント行（`#`で始まる行）は実行しないでください。コメントは説明用です。

**方法A: シンボリックリンクを使用する（推奨）**

まず、シンボリックリンクが存在するか確認：

```bash
# Apple Silicon Macの場合
ls -la /opt/homebrew/opt/postgresql@16/bin/pg_dump

# Intel Macの場合
ls -la /usr/local/opt/postgresql@16/bin/pg_dump
```

**シンボリックリンクが存在する場合（エラーが出ない場合）：**

Apple Silicon Macの場合：
```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

Intel Macの場合：
```bash
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
```

**方法B: 実際のCellarパスを使用する（シンボリックリンクが存在しない場合）**

ステップ4の`find`コマンドの結果を見て、表示されたパスから`/bin`までのディレクトリパスを取得します。

**例：**
- `find`コマンドの結果が `/opt/homebrew/Cellar/postgresql@16/16.11/bin/pg_dump` の場合
- 使用するパスは `/opt/homebrew/Cellar/postgresql@16/16.11/bin` です

**実際に実行するコマンド：**

```bash
# findコマンドの結果に基づいて、/binまでのディレクトリパスを使用
# 例：findの結果が /opt/homebrew/Cellar/postgresql@16/16.11/bin/pg_dump の場合
export PATH="/opt/homebrew/Cellar/postgresql@16/16.11/bin:$PATH"
```

**具体的な手順：**

1. `find`コマンドの結果を確認（例：`/opt/homebrew/Cellar/postgresql@16/16.11/bin/pg_dump`）
2. 最後の`/pg_dump`を削除して、`/bin`までのパスを取得（例：`/opt/homebrew/Cellar/postgresql@16/16.11/bin`）
3. そのパスを使用して`export PATH`を実行

**例：**
```bash
# findの結果: /opt/homebrew/Cellar/postgresql@16/16.11/bin/pg_dump
# → 使用するパス: /opt/homebrew/Cellar/postgresql@16/16.11/bin
export PATH="/opt/homebrew/Cellar/postgresql@16/16.11/bin:$PATH"
```

**ステップ6: 正常に動作するか確認**

```bash
pg_dump --version
```

正常に動作すれば、バージョン情報が表示されます（例：`pg_dump (PostgreSQL) 16.11 (Homebrew)`）。

**✅ 確認が完了したら：**
バージョン情報が正常に表示されれば、**「✅ 2) pg_dumpで「スキーマ＋データ」完全バックアップを作る」**セクションに進んでください。

**エラーが出る場合：**
- `command not found` エラーが出る場合は、ステップ4で確認した実際のパスを使用して、ステップ5を再度実行してください。

#### 対処1: HomebrewでインストールしたPostgreSQLのパスを通す（インストール済みの場合）

**まず、実際の`pg_dump`のパスを確認：**

```bash
# 実際のパスを確認
find /opt/homebrew -name pg_dump 2>/dev/null
# または（Intel Macの場合）
find /usr/local -name pg_dump 2>/dev/null
```

**または、シンボリックリンクを確認：**
```bash
# Apple Silicon Macの場合
ls -la /opt/homebrew/opt/postgresql@16/bin/pg_dump

# Intel Macの場合
ls -la /usr/local/opt/postgresql@16/bin/pg_dump
```

**一時的にパスを通す方法（現在のターミナルセッションのみ）：**

⚠️ **重要：** コメント行（`#`で始まる行）は実行しないでください。コメントは説明用です。

**実際に実行するコマンド（どちらか一方のみ）：**

Apple Silicon Macの場合：
```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

Intel Macの場合：
```bash
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
```

**シンボリックリンクが存在しない場合：**

もし`/opt/homebrew/opt/postgresql@16/bin/pg_dump`が存在しない場合は、実際のCellarパスを使用：

```bash
# 実際のパスを確認（上記のfindコマンドで確認したパスを使用）
# 例：/opt/homebrew/Cellar/postgresql@16/16.11/bin
export PATH="/opt/homebrew/Cellar/postgresql@16/16.11/bin:$PATH"
```

**確認：**
```bash
pg_dump --version
```

正常に動作すれば、バージョン情報が表示されます。

**永続的にパスを通す方法：**
`~/.zshrc` ファイルに以下を追加：

```bash
# PostgreSQL 16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
# または（Intel Macの場合）
export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
```

追加後、設定を反映：
```bash
source ~/.zshrc
```

#### 対処2: フルパスで実行する

パスを通さずに、フルパスで直接実行する方法：

```bash
# PostgreSQL 16の場合（Apple Silicon Mac）
/opt/homebrew/opt/postgresql@16/bin/pg_dump --version

# PostgreSQL 16の場合（Intel Mac）
/usr/local/opt/postgresql@16/bin/pg_dump --version
```

バックアップコマンドも同様にフルパスで実行：
```bash
/opt/homebrew/opt/postgresql@16/bin/pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

#### 対処3: 別の方法でPostgreSQLクライアントをインストール

Homebrew以外の方法：

```bash
# PostgreSQL公式インストーラーを使用
# https://www.postgresql.org/download/macosx/ からダウンロード

# または、Postgres.appを使用
# https://postgresapp.com/ からダウンロード
```

**確認：**
どの対処法を試した後も、以下で確認してください：
```bash
pg_dump --version
```

正常に表示されれば、次のステップ（バックアップ作成）に進めます。

---

## ✅ 1) Supabaseから接続情報を取得（本番 carebridge-hub-prod）

### ステップ1: Supabaseダッシュボードを開く

1. ブラウザで https://supabase.com にアクセス
2. ログイン（まだログインしていない場合）
3. プロジェクト「**carebridge-hub-prod**」を選択

### ステップ2: 接続情報を取得

現在「Database」セクションの「Schemas」ページにいる場合の手順：

1. **左側のサイドバーの最上部**（「Database」セクションより上）を確認
   - サイドバーの上部に **「Settings」** という項目があるはずです（歯車アイコン付き）
   - この **「Settings」** をクリックしてください
   - ⚠️ 注意：左サイドバーの「CONFIGURATION」セクション内の「Settings」ではなく、サイドバー最上部の **「Settings」** です

2. **「Settings」** をクリックすると、サブメニューが表示されます
   - **「Project Settings」** という項目をクリックしてください

3. **「Project Settings」** ページが開いたら、上部にタブが表示されます
   - **「Database」** タブをクリックしてください

4. **「Database」** タブを開くと、ページ内に複数のセクションが表示されます
   - ページをスクロールして **「Connection string」** セクションを探してください
   - 「Connection string」セクションには、接続文字列が表示されます

5. **「Connection string」** セクション内で、以下の2つのオプションが表示されます：
   - **「Direct connection」** （推奨）
   - **「Session pooler」**
   - `pg_dump`は基本 **「Direct connection」** を推奨（ダメなら pooler を試す）

6. **接続文字列をコピー**
   - 「Direct connection」の接続文字列をコピーしてください（後で使います）
   - 接続文字列の形式：`postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

7. **DB password** も必要
   - 同じ「Database」タブ内の **「Database password」** セクションで確認/再設定できます
   - 「Database password」セクションには **「Reset database password」** ボタンがあります
   - パスワードを忘れた場合は、このボタンで再設定できます

⚠️ **セキュリティ注意：**
- 接続情報はこのチャットに貼らなくてOK（漏洩防止）
- 貼る場合は `host` の先頭と `project ref` 以外マスクする

**接続文字列の例（マスク済み）：**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### 📝 パスワードを安全に共有する方法

パスワードを再設定した後、チャットで共有する場合は以下の方法で安全に共有してください：

#### 方法1: パスワードをマスクして共有（推奨）

パスワードの一部だけを表示し、残りは `*` や `X` でマスクします。

**例：**
- 実際のパスワード: `carekanjinagatomibridge`
- マスク済み: `care*******bridge` または `careXXXXXXXXXbridge`
- または: `care*******` （末尾のみ表示）

**共有例：**
```
パスワード: care*******bridge
（最初の4文字と最後の6文字のみ表示）
```

#### 方法2: パスワードの長さと特徴のみ共有

パスワードの内容ではなく、長さや特徴のみを共有します。

**例：**
```
パスワード: 20文字、英数字のみ
```

#### 方法3: 環境変数として共有（最も安全）

パスワードを直接共有せず、環境変数の設定方法として共有します。

**例：**
```
パスワードは環境変数 PGPASSWORD に設定済みです。
実行時は以下のコマンドを使用してください：
export PGPASSWORD='(再設定したパスワード)'
```

#### 方法4: パスワードを完全にマスク

パスワードを完全に `*` で置き換えます。

**例：**
```
パスワード: ********************
（20文字）
```

**推奨：方法1（一部マスク）**
- パスワードの最初の数文字と最後の数文字を表示
- 例：`care*******bridge` のように、最初と最後を表示して中間をマスク
- これにより、パスワードの形式を確認できつつ、完全な漏洩を防げます

**⚠️ 注意：**
- パスワードを再設定した場合は、**必ずマスクして共有**してください
- 完全なパスワードをチャットに貼り付けることは避けてください
- パスワードを共有した後は、必要に応じて再度変更することを検討してください

---

## ✅ 2) pg_dumpで「スキーマ＋データ」完全バックアップを作る（推奨）

⚠️ **事前確認：** このセクションに進む前に、以下を完了してください：

1. **「✅ 0) 事前準備（ローカルPC）」**を完了
2. `pg_dump --version` が正常に動作することを確認（例：`pg_dump (PostgreSQL) 16.11 (Homebrew)` が表示される）

✅ **`pg_dump --version`が正常に動作している場合：**
このセクション（バックアップ作成）に進んでください。

❌ **`zsh: command not found: pg_dump` というエラーが出る場合：**
事前準備セクションの「⚠️ `pg_dump`が見つからない場合の対処法」を参照してください。

### 📝 実行方法について

バックアップを作成する方法は2つあります：

#### 方法A: 一つ一つコマンドを実行する（推奨：初回・確認しながら実行）

ターミナルで、以下のステップを**順番に一つずつ**実行します。
- 各コマンドの実行結果を確認しながら進められます
- エラーが発生した場合、どのステップで問題が起きたか分かりやすい
- 初回実行時や、手順を確認しながら実行したい場合に適しています

#### 方法B: 一括で実行するスクリプト（効率的：2回目以降）

全てのコマンドを一つのスクリプトにまとめて実行します。
- 一度に全てのバックアップを作成できる
- 2回目以降の実行時に便利
- スクリプトの例は「方法B: 一括実行スクリプト」セクションを参照

---

### 方法A: 一つ一つコマンドを実行する（推奨：初回）

以下のステップを**順番に一つずつ**ターミナルで実行してください。

### ステップ1: バックアップ用ディレクトリを作る

```bash
mkdir -p backups/prod
```

### ステップ2: 環境変数でパスワードを一時セット（shell履歴に残しにくい）

```bash
export PGPASSWORD='(DB_PASSWORD)'
```

⚠️ `(DB_PASSWORD)` を実際のパスワードに置き換えてください。

**実際の値の例（carebridge-hub-prodの場合）：**
```bash
export PGPASSWORD='carekanjinagatomibridge'
```

**⚠️ 重要：** パスワードを再設定した場合は、新しいパスワードを使用してください。以前のパスワードは無効になります。

**パスワード設定の確認：**

環境変数が正しく設定されたか確認：

```bash
echo $PGPASSWORD
```

- パスワードが表示されれば、設定成功です
- 何も表示されない場合は、再度`export PGPASSWORD='(パスワード)'`を実行してください

**パスワードが分からない場合：**

Supabaseダッシュボードで確認/再設定：
1. Supabaseダッシュボード → **「Settings」** → **「Project Settings」** → **「Database」** タブ
2. **「Database password」** セクションで確認
3. 必要に応じて **「Reset database password」** ボタンで再設定

### ステップ3: 接続先を指定してダンプ（カスタム形式 .dump）

```bash
pg_dump \
  --host=(DB_HOST) \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**パラメータ説明：**
- `(DB_HOST)`: Supabaseの接続文字列に出るホスト（例：`db.xxxxx.supabase.co`）

**実際の値の例（carebridge-hub-prodの場合）：**
```bash
pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**パラメータ説明：**
- `--format=custom`: カスタム形式（圧縮され、復元しやすい）
- `--file=...`: 出力先ファイル（タイムスタンプ付き）

⚠️ **注意：**
- ユーザー/DB名はプロジェクト設定により違う場合があるため、Dashboardのconnection stringを優先
- 接続文字列に `postgres` 以外のユーザー名が指定されている場合は、それを使用

### ステップ4: 追加で「スキーマだけ」も保存（差分レビュー用）

```bash
pg_dump \
  --host=(DB_HOST) \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema-only \
  --file=backups/prod/carebridge-hub-prod_schema_$(date +%Y%m%d_%H%M).sql
```

**実際の値の例（carebridge-hub-prodの場合）：**
```bash
pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema-only \
  --file=backups/prod/carebridge-hub-prod_schema_$(date +%Y%m%d_%H%M).sql
```

**パラメータ説明：**
- `--schema-only`: スキーマ（テーブル定義、関数、トリガー等）のみをダンプ
- `.sql` 形式：テキスト形式なので、差分レビューやGit管理がしやすい

**実行中の表示：**
- `pg_dump`は、エラーが発生しない限り、進行状況を表示しません
- コマンドを実行した後、何も表示されずにプロンプトが戻るのは**正常な動作**です
- エラーが発生した場合は、エラーメッセージが表示されます

**完了後の確認：**

スキーマバックアップファイルが作成されたか確認します：

```bash
# スキーマバックアップファイルが作成されたか確認
ls -lh backups/prod/carebridge-hub-prod_schema_*.sql
```

**期待される結果：**
- ファイルが存在する
- ファイルサイズが0バイトでない（通常、数KB〜数百KB）
- ファイル名にタイムスタンプが含まれている

**例：**
```
-rw-r--r--  1 kanji  staff   45K Dec 15 23:40 backups/prod/carebridge-hub-prod_schema_20251215_2340.sql
```

**確認ポイント：**
- ✅ ファイルが存在する
- ✅ ファイルサイズが0バイトでない
- ✅ エラーメッセージが表示されていない

✅ **確認が完了したら：** 次のステップ5に進んでください。

### ステップ5: パスワード環境変数を解除

セキュリティのため、パスワード環境変数を解除します：

```bash
unset PGPASSWORD
```

**確認：**
```bash
echo $PGPASSWORD
```

何も表示されなければ成功です。

---

### ✅ バックアップ作成の完了確認

全てのバックアップファイルが正常に作成されたか確認します：

```bash
# 全てのバックアップファイルを確認
ls -lh backups/prod/
```

**期待される結果：**
- `carebridge-hub-prod_full_*.dump` ファイルが存在し、サイズが0バイトでない
- `carebridge-hub-prod_schema_*.sql` ファイルが存在し、サイズが0バイトでない

**例：**
```
-rw-r--r--  1 kanji  staff  336K Dec 15 23:35 backups/prod/carebridge-hub-prod_full_20251215_2335.dump
-rw-r--r--  1 kanji  staff   45K Dec 15 23:40 backups/prod/carebridge-hub-prod_schema_20251215_2340.sql
```

**確認結果の見方：**

**成功の例：**
```
-rw-r--r--  1 kanji  staff   0B 12 15 23:15 carebridge-hub-prod_full_20251215_2315.dump
-rw-r--r--  1 kanji  staff   0B 12 15 23:25 carebridge-hub-prod_full_20251215_2325.dump
-rw-r--r--  1 kanji  staff  336K 12 15 23:35 carebridge-hub-prod_full_20251215_2335.dump
-rw-r--r--  1 kanji  staff  252K 12 15 23:40 carebridge-hub-prod_schema_20251215_2340.sql
```

この場合：
- ✅ 最新の完全バックアップ（23:35、336K）が成功
- ✅ スキーマバックアップ（23:40、252K）が成功
- ⚠️ 以前の完全バックアップ（23:15、23:25）は0バイトですが、最新のものが成功していれば問題ありません

**確認ポイント：**
- ✅ 最新の完全バックアップ（`.dump`）ファイルが存在し、サイズが0バイトでない
- ✅ スキーマバックアップ（`.sql`）ファイルが存在し、サイズが0バイトでない
- ✅ エラーメッセージが表示されていない

**✅ 確認が完了したら：**
- 完全バックアップ（`.dump`）とスキーマバックアップ（`.sql`）の両方が存在し、サイズが0バイトでなければ成功です
- 次のセクション「✅ 3) バックアップが"復元できそうか"を最低限チェック」に進んでください

---

### ⚠️ よくあるエラーと対処法

バックアップ作成中にエラーが発生した場合、以下の対処法を試してください。

#### エラー1: `zsh: command not found: pg_dump`

**原因：** PATHが設定されていない、または新しいターミナルセッションで実行した

**対処法：**
```bash
# 同じターミナルセッションでPATHを再設定
export PATH="/opt/homebrew/Cellar/postgresql@16/16.11/bin:$PATH"

# 確認
pg_dump --version
```

正常に動作することを確認してから、バックアップ作成を再実行してください。

#### エラー2: `pg_dump: error: connection to server at "db.xxxxx.supabase.co" (xxx.xxx.xxx.xxx), port 5432 failed: FATAL: password authentication failed for user "postgres"`

**原因：** パスワードが間違っている、または環境変数`PGPASSWORD`が設定されていない

**対処法（ステップバイステップ）：**

**ステップ1: 環境変数`PGPASSWORD`が設定されているか確認**

```bash
echo $PGPASSWORD
```

- 何も表示されない場合 → 環境変数が設定されていません
- パスワードが表示される場合 → 設定されていますが、パスワードが間違っている可能性があります

**ステップ2: Supabaseダッシュボードでパスワードを確認/再設定**

1. Supabaseダッシュボードを開く
2. プロジェクト「**carebridge-hub-prod**」を選択
3. 左側のサイドバーから **「Settings」** → **「Project Settings」** → **「Database」** タブを開く
4. **「Database password」** セクションを確認
5. パスワードを忘れた場合や、再設定したい場合は、**「Reset database password」** ボタンをクリック
6. 新しいパスワードを設定（または既存のパスワードを確認）

**ステップ3: 環境変数`PGPASSWORD`を正しいパスワードで再設定**

```bash
# 正しいパスワードに置き換えてください
export PGPASSWORD='(正しいパスワード)'
```

⚠️ **注意：** パスワードをチャットに貼り付ける場合は、必ずマスクしてください（例：`care*******bridge`）

**ステップ4: 環境変数が正しく設定されたか確認**

```bash
# パスワードが表示されることを確認（セキュリティ上、実際のパスワードは表示されますが、これは確認用です）
echo $PGPASSWORD
```

**ステップ5: バックアップ作成を再実行**

環境変数を設定した後、バックアップ作成コマンドを再実行：

```bash
pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**パスワードを再設定した場合：**

パスワードを再設定した場合は、新しいパスワードで環境変数を設定してください。以前のパスワードは無効になります。

**確認ポイント：**
- ✅ 環境変数`PGPASSWORD`が設定されているか
- ✅ パスワードが正しいか（Supabaseダッシュボードで確認）
- ✅ パスワードに特殊文字が含まれている場合、シェルでエスケープが必要な場合がある

#### エラー3: `pg_dump: error: connection to server at "db.xxxxx.supabase.co" (xxx.xxx.xxx.xxx), port 5432 failed: timeout expired`

**原因：** ネットワーク接続の問題、またはファイアウォールでブロックされている

**対処法：**
1. インターネット接続を確認
2. Supabaseダッシュボードで、ネットワーク制限が設定されていないか確認
3. しばらく待ってから再実行

#### エラー4: `pg_dump: error: could not connect to server: could not translate host name "db.xxxxx.supabase.co" to address: nodename nor servname provided, or not known`

**原因：** ホスト名が間違っている、またはDNS解決の問題

**対処法：**
1. 接続文字列のホスト名が正しいか確認（Supabaseダッシュボードで再確認）
2. インターネット接続を確認
3. 正しいホスト名で再実行

#### エラー5: `pg_dump: error: could not open output file "backups/prod/...": No such file or directory`

**原因：** バックアップ用ディレクトリが作成されていない

**対処法：**
```bash
# バックアップ用ディレクトリを作成
mkdir -p backups/prod

# バックアップ作成を再実行
```

#### エラー6: `pg_dump: エラー: サーバーバージョンの不一致のため処理を中断します` または `pg_dump: error: server version mismatch; server is version X.X, client is version 16.11`

**原因：** PostgreSQLサーバーのバージョンと、ローカルの`pg_dump`クライアントのバージョンが一致していない

**エラーメッセージの例：**
- `サーバーバージョン:17.6、pg_dump バージョン: 16.11`
- これは、SupabaseのPostgreSQLサーバーが17.6で、ローカルの`pg_dump`が16.11であることを示しています

**対処法（ステップバイステップ）：**

**方法A: PostgreSQL 17のクライアントをインストールする（推奨）**

**ステップ1: PostgreSQL 17をインストール**

```bash
brew install postgresql@17
```

**ステップ2: 実際の`pg_dump`のパスを確認**

```bash
# PostgreSQL 17のpg_dumpのパスを確認
find /opt/homebrew -name pg_dump 2>/dev/null | grep postgresql@17
```

**期待される結果：**
- `/opt/homebrew/Cellar/postgresql@17/17.x/bin/pg_dump` など

**ステップ3: PATHをPostgreSQL 17に切り替える**

ステップ2で確認した実際のパスを使用して、PATHを設定します。

**実際のパスに基づく設定：**

ステップ2の結果が `/opt/homebrew/Cellar/postgresql@17/17.7/bin/pg_dump` の場合：

```bash
# 実際のパスから /bin までのディレクトリパスを使用
export PATH="/opt/homebrew/Cellar/postgresql@17/17.7/bin:$PATH"
```

**または、シンボリックリンクが存在する場合：**

```bash
# シンボリックリンクを確認
ls -la /opt/homebrew/opt/postgresql@17/bin/pg_dump

# シンボリックリンクが存在する場合
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
```

**⚠️ 重要：** ステップ2で確認した実際のパスに合わせて、バージョン番号（17.6、17.7など）を調整してください。

**ステップ4: バージョンを確認**

```bash
pg_dump --version
```

`pg_dump (PostgreSQL) 17.x` が表示されれば成功です。

✅ **確認が完了したら：** 次のステップ5に進んでください。

**ステップ5: バックアップ作成を再実行**

**⚠️ 事前確認：** バックアップ作成を実行する前に、環境変数`PGPASSWORD`が設定されているか確認してください。

```bash
# 環境変数PGPASSWORDが設定されているか確認
echo $PGPASSWORD
```

- パスワードが表示されれば、設定されています ✅
- 何も表示されない場合は、以下で設定してください：
  ```bash
  export PGPASSWORD='(正しいパスワード)'
  ```

**バックアップ作成コマンドを実行：**

```bash
pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**実行中の表示：**
- バックアップ作成には数分かかることがあります
- **⚠️ 重要：** `pg_dump`は、エラーが発生しない限り、進行状況を表示しません
- コマンドを実行した後、何も表示されずにプロンプトが戻るのは**正常な動作**です
- エラーが発生した場合は、エラーメッセージが表示されます
- 正常に完了すると、プロンプトが表示されます（何も表示されない状態からプロンプトに戻る）

**完了後の確認（必ず実行してください）：**

バックアップが正常に作成されたか確認します：

```bash
# バックアップファイルが作成されたか確認
ls -lh backups/prod/carebridge-hub-prod_full_*.dump
```

**期待される結果：**
- ファイルが存在する
- ファイルサイズが0バイトでない（通常、数MB〜数百MB）
- ファイル名にタイムスタンプが含まれている

**例：**
```
-rw-r--r--  1 kanji  staff   15M Dec 15 10:30 backups/prod/carebridge-hub-prod_full_20241215_1030.dump
```

**確認ポイント：**
- ✅ ファイルが存在する
- ✅ ファイルサイズが0バイトでない
- ✅ エラーメッセージが表示されていない

**複数のバックアップファイルが存在する場合：**

複数のバックアップファイルが表示される場合があります。この場合、**最新のファイル（タイムスタンプが最も新しいもの）**を確認してください。

**例：**
```
-rw-r--r--  1 kanji  staff   0B 12 15 23:15 backups/prod/carebridge-hub-prod_full_20251215_2315.dump
-rw-r--r--  1 kanji  staff   0B 12 15 23:25 backups/prod/carebridge-hub-prod_full_20251215_2325.dump
-rw-r--r--  1 kanji  staff  336K 12 15 23:35 backups/prod/carebridge-hub-prod_full_20251215_2335.dump
```

この場合、最新のファイル（23:35、336K）が成功しています。以前のファイル（0バイト）は失敗していますが、最新のファイルが成功していれば問題ありません。

**ファイルが存在しない、または最新のファイルが0バイトの場合：**
- エラーメッセージが表示されていないか確認
- 上記の「よくあるエラーと対処法」を参照
- バックアップ作成コマンドを再実行

**✅ 成功の確認：**
最新のバックアップファイルが存在し、サイズが0バイトでなければ成功です。次のステップ（スキーマのみのバックアップ作成）に進んでください。

**方法B: フルパスでPostgreSQL 17のpg_dumpを実行する（一時的な対処）**

PostgreSQL 17をインストールした後、フルパスで直接実行：

```bash
/opt/homebrew/Cellar/postgresql@17/17.6/bin/pg_dump \
  --host=db.wqtnffvhhssgdnecjwpy.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file=backups/prod/carebridge-hub-prod_full_$(date +%Y%m%d_%H%M).dump
```

**注意：**
- PostgreSQL 16と17は共存できますが、PATHの設定によってどちらが使われるかが決まります
- バックアップ作成時は、PostgreSQL 17の`pg_dump`を使用してください
- 永続的にPostgreSQL 17を使う場合は、`~/.zshrc`にPATHを追加してください

#### エラー7: バックアップは作成されたが、ファイルサイズが0バイト

**原因：** バックアップ作成中にエラーが発生したが、エラーメッセージが表示されなかった

**対処法：**
1. バックアップ作成コマンドを再実行
2. エラーメッセージを確認
3. 上記のエラー1〜6の対処法を試す

#### トラブルシューティングのチェックリスト

エラーが発生した場合、以下を順番に確認してください：

1. ✅ `pg_dump --version` が正常に動作するか確認
2. ✅ 環境変数`PGPASSWORD`が正しく設定されているか確認
3. ✅ 接続情報（ホスト、ポート、ユーザー名、データベース名）が正しいか確認
4. ✅ バックアップ用ディレクトリが作成されているか確認
5. ✅ インターネット接続が正常か確認
6. ✅ Supabaseダッシュボードで、ネットワーク制限が設定されていないか確認

---

### 方法B: 一括で実行するスクリプト（効率的：2回目以降）

全てのコマンドを一つのスクリプトにまとめて実行する方法です。

#### スクリプトの作成

プロジェクトのルートディレクトリに、以下の内容で `backup-prod.sh` というファイルを作成します：

```bash
#!/bin/bash

# 本番DBバックアップスクリプト（carebridge-hub-prod）

# 設定（実際の値に置き換えてください）
DB_HOST="db.wqtnffvhhssgdnecjwpy.supabase.co"
DB_PASSWORD="carekanjinagatomibridge"  # ⚠️ 実際のパスワードに置き換えてください
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="backups/prod"

# バックアップ用ディレクトリを作成
mkdir -p "$BACKUP_DIR"

# 環境変数でパスワードを設定
export PGPASSWORD="$DB_PASSWORD"

# タイムスタンプを取得
TIMESTAMP=$(date +%Y%m%d_%H%M)

# 完全バックアップ（カスタム形式）を作成
echo "完全バックアップを作成中..."
pg_dump \
  --host="$DB_HOST" \
  --port=5432 \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --file="$BACKUP_DIR/carebridge-hub-prod_full_$TIMESTAMP.dump"

if [ $? -eq 0 ]; then
  echo "✅ 完全バックアップが完了しました: $BACKUP_DIR/carebridge-hub-prod_full_$TIMESTAMP.dump"
else
  echo "❌ 完全バックアップの作成に失敗しました"
  unset PGPASSWORD
  exit 1
fi

# スキーマのみのバックアップを作成
echo "スキーマのみのバックアップを作成中..."
pg_dump \
  --host="$DB_HOST" \
  --port=5432 \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --schema-only \
  --file="$BACKUP_DIR/carebridge-hub-prod_schema_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
  echo "✅ スキーマバックアップが完了しました: $BACKUP_DIR/carebridge-hub-prod_schema_$TIMESTAMP.sql"
else
  echo "❌ スキーマバックアップの作成に失敗しました"
  unset PGPASSWORD
  exit 1
fi

# パスワード環境変数を解除
unset PGPASSWORD

echo ""
echo "🎉 全てのバックアップが完了しました！"
echo "バックアップファイル:"
ls -lh "$BACKUP_DIR"/*$TIMESTAMP*
```

#### スクリプトの実行

1. **スクリプトに実行権限を付与**
   ```bash
   chmod +x backup-prod.sh
   ```

2. **スクリプトを実行**
   ```bash
   ./backup-prod.sh
   ```

#### スクリプトのカスタマイズ

スクリプト内の以下の変数を、実際の値に置き換えてください：

- `DB_HOST`: Supabaseのホスト（例：`db.wqtnffvhhssgdnecjwpy.supabase.co`）
- `DB_PASSWORD`: データベースパスワード（⚠️ 実際のパスワードに置き換えてください）

#### セキュリティ注意

⚠️ **重要：** スクリプトファイルにパスワードが含まれているため、以下の点に注意してください：

- スクリプトファイルをGitにコミットしない（`.gitignore`に追加）
- スクリプトファイルの権限を適切に設定（`chmod 600 backup-prod.sh`）
- パスワードを環境変数から読み込む方法も検討（下記参照）

#### より安全な方法：環境変数からパスワードを読み込む

パスワードをスクリプトに直接書かず、環境変数から読み込む方法：

```bash
#!/bin/bash

# 環境変数からパスワードを読み込む（スクリプトに直接書かない）
if [ -z "$DB_PASSWORD" ]; then
  echo "❌ エラー: DB_PASSWORD環境変数が設定されていません"
  echo "実行前に以下を実行してください:"
  echo "  export DB_PASSWORD='(実際のパスワード)'"
  exit 1
fi

# その他の設定
DB_HOST="db.wqtnffvhhssgdnecjwpy.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="backups/prod"

# ... (以下、同じ)
```

この場合の実行方法：
```bash
export DB_PASSWORD='(実際のパスワード)'
./backup-prod.sh
```

---

## ✅ 3) バックアップが"復元できそうか"を最低限チェック（読み取りのみ）

### チェック1: dumpファイルが作られていること

```bash
ls -lh backups/prod
```

**期待される結果：**
- `carebridge-hub-prod_full_YYYYMMDD_HHMM.dump` が存在
- `carebridge-hub-prod_schema_YYYYMMDD_HHMM.sql` が存在
- ファイルサイズが0バイトでないこと

### チェック2: schema.sql の中に public テーブル一覧が入っていること（目視）

```bash
head -n 50 backups/prod/*schema*.sql
```

**確認ポイント：**
- `CREATE TABLE` 文が含まれているか
- `public` スキーマのテーブル定義が含まれているか
- エラーメッセージが含まれていないか

**正常な結果の例：**
```sql
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.x
-- Dumped by pg_dump version 16.x

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Name: facilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    ...
);
```

### （オプション）復元テスト

復元テストまでやるなら、別のローカルPostgresや別プロジェクトで行うが、ここでは任意。

**復元コマンド例（参考）：**
```bash
pg_restore \
  --host=(LOCAL_DB_HOST) \
  --port=5432 \
  --username=postgres \
  --dbname=test_restore \
  --clean \
  --if-exists \
  backups/prod/carebridge-hub-prod_full_YYYYMMDD_HHMM.dump
```

---

## ✅ 4) Storage（attachments / client-documents）も別途バックアップ（重要）

⚠️ **重要：** DBの`pg_dump`にはStorageの実ファイルは含まれない。

本番で運用するなら最低限、objects一覧を取る＆必要ならダウンロード手段を確保する。

### ステップ1: SQL Editorで objects一覧（読み取りのみ）

1. Supabaseダッシュボードで **「SQL Editor」** を開く
2. 以下のSQLを実行：

```sql
-- Storage objects の件数確認
SELECT 
  bucket_id, 
  COUNT(*) as object_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes
FROM storage.objects
WHERE bucket_id IN ('attachments', 'client-documents')
GROUP BY bucket_id;
```

**確認ポイント：**
- 各バケットのオブジェクト数
- 合計サイズ（バイト）

### ステップ2: 代表的な保存パスを確認

```sql
-- 代表的な保存パスを確認
SELECT 
  bucket_id, 
  name, 
  created_at,
  (metadata->>'size')::bigint as size_bytes
FROM storage.objects
WHERE bucket_id IN ('attachments', 'client-documents')
ORDER BY created_at DESC
LIMIT 50;
```

**確認ポイント：**
- ファイルパス（`name`列）の形式
- 最新のファイルが正しく保存されているか

### ステップ3: 本格的にバックアップする場合

本格的にバックアップする場合は：

1. **Supabase Storageの一覧を取得**
2. **管理者アカウントで署名URL（signed URL）を生成**
3. **ダウンロードスクリプトでローカル保存**

（この手順が必要なら、別プロンプトで "Storageバックアップスクリプト生成" を作る）

---

## ✅ 5) ここまで完了したら「notifications最小実装」などのDB変更に進む

### 変更前のチェックリスト

- [ ] `pg_dump`の full dump がローカルに存在
- [ ] `pg_dump`の schema-only がローカルに存在
- [ ] `storage.objects` の状況が確認できている（最低限一覧/件数）
- [ ] バックアップファイルのサイズが0バイトでないことを確認

### DB変更時の注意事項

- **変更SQLは必ずファイルに書き出してレビューしてから実行**
- **変更の実行は一括ではなく、段階的に（テーブル→RLS→trigger→テスト）**
- **各変更後に動作確認を行う**

---

## ✅ Done条件

以下の条件を全て満たしたら、本番DB変更に進んで良い状態です：

- [ ] `pg_dump`の full dump と schema-only がローカルに存在
- [ ] `storage.objects` の状況が確認できている（最低限一覧/件数）
- [ ] バックアップファイルが正常に作成されていることを確認
- [ ] これ以降の本番DB変更に進んで良い状態になっている

---

## 📝 補足説明

### なぜバックアップが必要なのか？

- **Supabase無料プランでは自動バックアップが使えない**
  - 有料プランでは自動バックアップが提供されますが、無料プランでは手動でバックアップを取る必要があります

- **DB変更前の安全策**
  - スキーマ変更やデータ変更を行う前に、必ずバックアップを取ることで、問題が発生した場合に復元できます

- **復元可能性の確保**
  - `pg_dump`のカスタム形式（`.dump`）は、圧縮されていて復元しやすい形式です

### pg_dumpの形式について

- **カスタム形式（`.dump`）**: 推奨
  - 圧縮されているため、ファイルサイズが小さい
  - 復元が高速
  - 選択的な復元が可能

- **SQL形式（`.sql`）**: スキーマのみの場合に推奨
  - テキスト形式なので、差分レビューやGit管理がしやすい
  - 人間が読みやすい

### Storageバックアップについて

- **DBのバックアップにはStorageの実ファイルは含まれない**
  - `pg_dump`はデータベースの内容のみをバックアップします
  - Storageの実ファイルは別途バックアップが必要です

- **最低限の確認**
  - オブジェクト一覧と件数を確認することで、どのファイルが存在するかを把握できます

---

## 🔗 関連ドキュメント

- [本番環境検証ガイド](./production-verification-guide.md)
- [本番環境検証ステップバイステップ](./production-verification-step-by-step.md)

