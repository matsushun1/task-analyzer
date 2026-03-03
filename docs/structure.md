# プロジェクトディレクトリ構成

**作成日**: 2026-02-24
**プロジェクト**: Notion Daily Report 自動生成システム

---

## ディレクトリツリー

```
task-analyzer/
├── docs/                               # 📚 ドキュメント
│   ├── architecture.md                 # アーキテクチャ設計
│   ├── functional-requirements.md      # 機能要件定義
│   ├── implementation-requirements.md  # 実装要件定義
│   └── structure.md                    # 本ファイル（ディレクトリ構成）
│
├── src/                                # 💻 ソースコード
│   ├── controllers/                    # 【Controller層】HTTPリクエスト処理
│   │   └── reportController.ts         # レポート生成エンドポイント、フロー制御
│   │
│   ├── models/                         # 【Model層】データモデル、ビジネスロジック
│   │   ├── types/                      # 型定義
│   │   │   ├── index.ts                # 型定義エクスポート
│   │   │   ├── notion.types.ts         # NotionTask, NotionDailyNote
│   │   │   ├── task.types.ts           # TaskData
│   │   │   ├── dailyNote.types.ts      # DailyNoteData
│   │   │   └── analysis.types.ts       # ClaudeAnalysisResult
│   │   │
│   │   ├── parsers/                    # ブロック解析ロジック
│   │   │   ├── deadlineParser.ts       # 期限パース（MM/DD → Date）
│   │   │   ├── workloadParser.ts       # 工数抽出（（3H）→ 3）
│   │   │   └── sectionParser.ts        # セクション分割（【今日行ったこと】等）
│   │   │
│   │   ├── task.model.ts               # TaskData変換、ブロック取得・解析
│   │   ├── dailyNote.model.ts          # DailyNoteData変換、ブロック取得・解析
│   │   └── analysis.model.ts           # Claude分析結果の検証、型ガード
│   │
│   ├── views/                          # 【View層】Notionページ生成
│   │   ├── blocks/                     # Notionブロック生成ヘルパー
│   │   │   ├── index.ts                # ブロック生成関数エクスポート
│   │   │   ├── headings.ts             # heading_1, heading_2
│   │   │   ├── lists.ts                # numbered_list_item, bulleted_list_item
│   │   │   ├── dividers.ts             # divider
│   │   │   └── paragraphs.ts           # paragraph
│   │   │
│   │   ├── types/
│   │   │   └── notionBlock.types.ts    # Notionブロック型定義
│   │   │
│   │   └── reportView.ts               # Notionレポートページ全体の生成
│   │
│   ├── services/                       # 【Services層】外部API通信
│   │   ├── notionService.ts            # Notion API操作（ブロック取得、追加）
│   │   ├── claudeService.ts            # Claude API呼び出し
│   │   └── authService.ts              # 認証チェック（SECRET_TOKEN検証）
│   │
│   ├── middleware/                     # ミドルウェア
│   │   ├── errorHandler.ts             # グローバルエラーハンドリング
│   │   └── asyncHandler.ts             # 非同期処理ラッパー
│   │
│   ├── utils/                          # ユーティリティ
│   │   ├── logger.ts                   # [INFO]/[WARN]/[ERROR]ログ出力
│   │   ├── errors.ts                   # カスタムエラークラス
│   │   ├── retryHelper.ts              # リトライロジック（exponential backoff）
│   │   └── validators.ts               # リクエストバリデーション
│   │
│   ├── config/                         # 設定
│   │   └── environment.ts              # 環境変数取得・検証
│   │
│   └── index.ts                        # エントリーポイント（Cloud Run起動）
│
├── tests/                              # 🧪 テスト
│   ├── unit/                           # ユニットテスト
│   │   ├── models/
│   │   │   ├── task.model.test.ts
│   │   │   ├── dailyNote.model.test.ts
│   │   │   └── parsers/
│   │   │       ├── deadlineParser.test.ts
│   │   │       ├── workloadParser.test.ts
│   │   │       └── sectionParser.test.ts
│   │   ├── views/
│   │   │   └── reportView.test.ts
│   │   ├── services/
│   │   │   ├── notionService.test.ts
│   │   │   ├── claudeService.test.ts
│   │   │   └── authService.test.ts
│   │   └── utils/
│   │       ├── logger.test.ts
│   │       └── retryHelper.test.ts
│   │
│   ├── integration/                    # 統合テスト
│   │   └── reportGeneration.test.ts    # エンドツーエンドのレポート生成テスト
│   │
│   └── fixtures/                       # テストデータ
│       ├── notionTasks.json            # サンプルNotionTask
│       ├── notionDailyNotes.json       # サンプルNotionDailyNote
│       └── claudeResponse.json         # サンプルClaude APIレスポンス
│
├── .claude/                            # Claude Code設定
├── .git/                               # Gitリポジトリ
├── .gitignore                          # Git除外設定
├── CLAUDE.md                           # コードスタイルガイド
├── package.json                        # npmパッケージ定義
├── tsconfig.json                       # TypeScript設定
├── .eslintrc.js                        # ESLint設定
├── .prettierrc                         # Prettier設定
└── README.md                           # プロジェクト説明
```

---

## MVCアーキテクチャ概要図

```mermaid
graph TB
    subgraph "Controller層"
        Controller[reportController.ts]
    end

    subgraph "Model層"
        TaskModel[task.model.ts]
        NoteModel[dailyNote.model.ts]
        AnalysisModel[analysis.model.ts]
        Parsers[parsers/*]
        Types[types/*]
    end

    subgraph "View層"
        ReportView[reportView.ts]
        Blocks[blocks/*]
    end

    subgraph "Services層"
        NotionService[notionService.ts]
        ClaudeService[claudeService.ts]
        AuthService[authService.ts]
    end

    subgraph "Utils層"
        Logger[logger.ts]
        Errors[errors.ts]
        RetryHelper[retryHelper.ts]
    end

    Request[HTTPリクエスト] --> Controller
    Controller --> AuthService
    Controller --> TaskModel
    Controller --> NoteModel
    TaskModel --> Parsers
    NoteModel --> Parsers
    TaskModel --> NotionService
    NoteModel --> NotionService
    Controller --> ClaudeService
    ClaudeService --> AnalysisModel
    Controller --> ReportView
    ReportView --> Blocks
    ReportView --> NotionService

    NotionService --> Logger
    ClaudeService --> Logger
    Controller --> Logger

    style Controller fill:#e1f5ff
    style TaskModel fill:#fff3cd
    style NoteModel fill:#fff3cd
    style ReportView fill:#d4edda
    style NotionService fill:#f8d7da
    style ClaudeService fill:#f8d7da
```

---

## 各ディレクトリの役割

### 📁 `src/controllers/` - Controller層

**役割**: HTTPリクエスト処理、認証、フロー制御

- `reportController.ts`: POST /generate-daily-report エンドポイント
  - リクエスト受け取り → 認証 → 202 Accepted返却
  - 非同期処理でModel/Services/Viewを調整
  - エラーハンドリング・ロギング

---

### 📁 `src/models/` - Model層

**役割**: データモデル定義、ビジネスロジック、データ変換

#### `models/types/` - 型定義
- Notion API形式と内部形式を明確に分離
- NotionTask/NotionDailyNote（外部形式）
- TaskData/DailyNoteData（内部形式）
- ClaudeAnalysisResult（AI分析結果）

#### `models/parsers/` - 解析ロジック
- **deadlineParser**: 期限文字列を解析（"2/20" → Date型）
- **workloadParser**: 工数を抽出（"（3H）" → 3）
- **sectionParser**: セクションを分割（【今日行ったこと】等）

#### `models/*.model.ts` - モデルロジック
- **task.model**: NotionTask → TaskData変換
- **dailyNote.model**: NotionDailyNote → DailyNoteData変換
- **analysis.model**: Claude分析結果の検証

---

### 📁 `src/views/` - View層

**役割**: Notionページ生成（ブロック構造の組み立て）

#### `views/blocks/` - ブロック生成ヘルパー
- 各ブロックタイプのヘルパー関数（純粋関数）
- heading1/heading2, numberedListItem, bulletedListItem, divider, paragraph

#### `views/reportView.ts` - レポート生成
- ClaudeAnalysisResult → NotionBlock[]への変換
- レポート全体の構造組み立て
- タイムスタンプ生成（YYYY/MM/DD HH:MM）

---

### 📁 `src/services/` - Services層

**役割**: 外部API（Notion, Claude）との通信

- **notionService**: Notion API操作
  - ブロック取得（3回リトライ）
  - ブロック追加（2回リトライ）
  - エラーレポート作成

- **claudeService**: Claude API呼び出し
  - モデル: claude-sonnet-4-6-20260217
  - max_tokens: 2000
  - リトライなし（コスト考慮）

- **authService**: 認証チェック
  - SECRET_TOKENとの照合

---

### 📁 `src/middleware/` - ミドルウェア

- **errorHandler**: グローバルエラーキャッチ、エラーログ出力
- **asyncHandler**: 非同期処理のtry-catchを統一

---

### 📁 `src/utils/` - ユーティリティ

- **logger**: [INFO]/[WARN]/[ERROR]ログ出力（Cloud Logging）
- **errors**: カスタムエラークラス
  - AuthenticationError（401）
  - NotionAPIError
  - ClaudeAPIError
  - BlockFetchError
- **retryHelper**: exponential backoffリトライロジック
- **validators**: リクエストバリデーション

---

### 📁 `src/config/` - 設定

- **environment**: 環境変数取得・検証
  - SECRET_TOKEN（認証用）
  - ANTHROPIC_API_KEY（Claude API）
  - NOTION_TOKEN（Notion Integration Token）

---

### 📁 `tests/` - テスト

- **unit/**: ユニットテスト（各モジュールを個別にテスト）
- **integration/**: 統合テスト（エンドツーエンドのフロー）
- **fixtures/**: テストデータ（JSON形式のサンプルデータ）

---

## データフロー

```mermaid
sequenceDiagram
    participant Client as Make.com
    participant Ctrl as Controller
    participant Auth as AuthService
    participant Model as Task/Note Model
    participant Parser as Parsers
    participant Notion as NotionService
    participant Claude as ClaudeService
    participant View as ReportView

    Client->>Ctrl: POST /generate-daily-report
    Ctrl->>Auth: verifySecret()
    Auth-->>Ctrl: OK
    Ctrl-->>Client: 202 Accepted

    Note over Ctrl: 非同期処理開始

    Ctrl->>Model: transform()
    Model->>Notion: fetchBlockChildren()
    Notion-->>Model: blocks
    Model->>Parser: parse()
    Parser-->>Model: TaskData/DailyNoteData
    Model-->>Ctrl: TaskData[], DailyNoteData[]

    Ctrl->>Claude: analyzeTasksAndNotes()
    Claude-->>Ctrl: ClaudeAnalysisResult

    Ctrl->>View: generateReportBlocks()
    View-->>Ctrl: NotionBlock[]

    Ctrl->>Notion: appendBlocks()
    Notion-->>Ctrl: Success
```

---

## レイヤー間の依存関係

```
┌─────────────────────────────────────────┐
│         Controller層                    │
│  (HTTPリクエスト処理、フロー制御)        │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Model層│ │ View層 │ │Services│ │ Utils  │
│        │ │        │ │   層   │ │   層   │
└────┬───┘ └───┬────┘ └───┬────┘ └────────┘
     │         │           │
     └─────────┴───────────┘
               │
         ┌─────┴─────┐
         ▼           ▼
    ┌────────┐  ┌────────┐
    │ Notion │  │ Claude │
    │  API   │  │  API   │
    └────────┘  └────────┘
```

**依存の方向**:
- Controller → Model/View/Services/Utils
- Model → Services/Utils/Parsers
- View → Services/Utils/Blocks
- Services → Utils

**原則**:
- 上位層から下位層への依存のみ許可
- 同一層内での依存は最小限に
- 循環依存は禁止
