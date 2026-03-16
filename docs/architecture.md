# Architecture - Notion Daily Report System

**作成日**: 2026-02-23
**対象**: Notion Daily Report 自動生成システム

---

## 1. システムアーキテクチャ

### 1.1 コンポーネント構成

```mermaid
graph TB
    User[👤 User]
    Notion[(📝 Notion)]
    NotionAuto[Notion Automations]
    Make[🔄 Make.com]
    CloudRun[☁️ Cloud Run<br/>TypeScript]
    Claude[🤖 Claude API<br/>Sonnet 4.6]

    User -->|1. ボタン押下| Notion
    Notion -->|2. Automation起動| NotionAuto
    NotionAuto -->|3. Webhook| Make
    Make -->|4. POST Request| CloudRun
    CloudRun -->|5. 202 Accepted| Make
    CloudRun -->|6. タスクDB取得<br/>Status=Doing| Notion
    CloudRun -->|7. デイリーノートDB取得<br/>直近14日分| Notion
    CloudRun -->|8. ページブロック取得| Notion
    CloudRun -->|9. 分析リクエスト| Claude
    Claude -->|10. 分析結果| CloudRun
    CloudRun -->|11. レポート作成| Notion

    style User fill:#e1f5ff
    style Notion fill:#fff3cd
    style Make fill:#d4edda
    style CloudRun fill:#cce5ff
    style Claude fill:#f8d7da
```

### 1.2 技術スタック

| レイヤー | 技術 | 役割 |
|---------|------|------|
| **UI** | Notion | ボタントリガー、データソース、レポート出力 |
| **Orchestration** | Make.com | Cloud Run呼び出し |
| **Backend** | Cloud Run (TypeScript) | データ解析、AI連携、レポート生成 |
| **AI** | Claude API (Sonnet 4.6) | タスク優先順位付け、アドバイス生成 |

---

## 2. 処理フロー

### 2.1 シーケンス図

```mermaid
sequenceDiagram
    actor User
    participant Notion
    participant Make.com
    participant Controller
    participant UseCase
    participant NotionAPI
    participant ClaudeAPI

    User->>Notion: 1. レポート生成ボタン押下
    Notion->>Make.com: 2. Webhook送信 (Automation)

    Make.com->>Controller: 3. POST /generate-daily-report
    Note over Controller: 認証チェック (authService)
    Controller-->>Make.com: 4. 202 Accepted

    Note over Controller: 非同期処理開始
    Controller->>UseCase: 5. execute()

    UseCase->>NotionAPI: 6. タスクDB取得 (Status="Doing")
    NotionAPI-->>UseCase: タスクリスト

    UseCase->>NotionAPI: 7. デイリーノートDB取得 (直近14日)
    NotionAPI-->>UseCase: デイリーノート

    loop 各タスクページ
        UseCase->>NotionAPI: 8. ページブロック取得
        NotionAPI-->>UseCase: ブロック内容 (期限、詳細)
    end

    loop 各デイリーノート
        UseCase->>NotionAPI: 9. ページブロック取得
        NotionAPI-->>UseCase: セクション別内容
    end

    UseCase->>ClaudeAPI: 10. 分析リクエスト
    Note over ClaudeAPI: ・優先順位付け<br/>・期限切れ抽出<br/>・体調アドバイス<br/>・タスク管理アドバイス（合計工数含む）
    ClaudeAPI-->>UseCase: 11. 分析結果

    UseCase->>NotionAPI: 12. レポートページ作成 (appendReportToPage)
    NotionAPI-->>UseCase: 作成完了
```

### 2.2 データフロー

```mermaid
graph LR
    subgraph Input["📥 入力データ"]
        TaskDB[(タスクDB<br/>Status=Doing)]
        DailyDB[(デイリーノートDB<br/>直近14日)]
    end

    subgraph Processing["⚙️ 処理"]
        Extract[データ抽出]
        Parse[パース処理]
        Analyze[AI分析]
    end

    subgraph Output["📤 出力"]
        Report[レポートページ]
    end

    TaskDB -->|タスク一覧| Extract
    DailyDB -->|ノート一覧| Extract

    Extract -->|期限・詳細・工数| Parse
    Parse -->|構造化データ| Analyze

    Analyze -->|今日のタスク Top10| Report
    Analyze -->|期限切れタスク| Report
    Analyze -->|体調アドバイス| Report
    Analyze -->|タスク管理アドバイス| Report

    style TaskDB fill:#fff3cd
    style DailyDB fill:#fff3cd
    style Analyze fill:#f8d7da
    style Report fill:#d4edda
```

---

## 3. データモデル

### 3.1 タスクDB構造

```mermaid
erDiagram
    TASK {
        string Name "タスク名"
        string Status "Doing/To Do/Done"
        datetime DateCreated "作成日時"
    }

    TASK_BLOCK {
        string SubTaskName "サブタスク名"
        string Deadline "期限 (MM/DD)"
        array Details "詳細リスト"
    }

    TASK ||--o{ TASK_BLOCK : "contains"
```

**取得条件**: `Status = "Doing"`

**ブロック抽出パターン**:
- 期限: `期限：MM/DD` または `期限：〇月下旬`
- 詳細: 「詳細」セクション配下の箇条書き

### 3.2 デイリーノートDB構造

```mermaid
erDiagram
    DAILY_NOTE {
        date Date "ノート日付"
    }

    DAILY_NOTE_SECTIONS {
        array TodayTasks "今日行ったこと"
        array NextTasks "翌営業日に行うこと"
        array Issues "課題・懸念事項"
        string HealthStatus "健康状態"
    }

    DAILY_NOTE ||--|| DAILY_NOTE_SECTIONS : "contains"
```

**取得条件**: `日付 >= (今日 - 14日)`

**セクション構造**:
- 【今日行ったこと】: タスク + 工数 (例: `予約登録APIの開発（4.5H）`)
- 【翌営業日に行うこと】: 計画タスク
- 【課題・懸念事項】: 管理上の課題
- 【健康状態】: 体調記述

---

## 4. AI分析処理

### 4.1 Claude API 処理フロー

```mermaid
graph TD
    Start([データ収集完了])

    Prepare[プロンプト構築]

    subgraph Claude["Claude API (Sonnet 4.6)"]
        T1[タスク優先順位付け]
        T2[期限切れタスク抽出]
        T3[体調傾向分析]
        T4[タスク管理分析]
    end

    Format[レポート整形]
    End([Notion出力])

    Start --> Prepare
    Prepare --> T1
    T1 --> T2
    T2 --> T3
    T3 --> T4
    T4 --> Format
    Format --> End

    style Claude fill:#f8d7da
```

### 4.2 分析アルゴリズム

**優先順位判定基準** (Claude AIが総合判断):
1. 期限が今日または過去のタスク → 最優先
2. デイリーノート「翌営業日に行うこと」記載タスク → 高優先
3. 工数が大きいタスク → 計画的に着手
4. 期限が「○月下旬」などの曖昧な表現 → 文脈から判断

**体調アドバイス観点**:
- 直近14日間の健康状態推移
- 悪化傾向の検出
- 改善提案 (100-200文字)

**タスク管理アドバイス観点**:
- 1日の合計工数が過多 → 負荷分散提案
- 特定タスクが長期化 → 効率化提案
- 期限切れタスク多数 → 見積もり改善提案

---

## 5. レポート生成

### 5.1 出力構造

```mermaid
graph TD
    Report[📊 Daily Report]

    S1[🎯 今日やるべきタスク]
    S2[⚠️ 期限切れタスク]
    S3[💪 体調アドバイス]
    S4[📝 タスク管理アドバイス]

    Report --> S1
    Report --> S2
    Report --> S3
    Report --> S4

    S1 --> T1[1. タスクA 期限: 2/20]
    S1 --> T2[2. タスクB 期限: 2月下旬]
    S1 --> T3[... 最大10件]

    S2 --> D1[タスクX - 期限: 2/15]
    S2 --> D2[タスクY - 期限: 2/18]

    style Report fill:#d4edda
    style S1 fill:#cce5ff
    style S2 fill:#f8d7da
    style S3 fill:#fff3cd
    style S4 fill:#e7e7e7
```

### 5.2 レポートページ仕様

**ページタイトル**: `📊 Daily Report - YYYY/MM/DD`

**セクション**:
1. **🎯 今日やるべきタスク** (最大10件)
   - タスク名、期限、選定理由
2. **⚠️ 期限切れタスク** (該当する全て)
   - タスク名、期限
3. **💪 体調アドバイス** (100-200文字)
   - Claude生成のアドバイス
4. **📝 タスク管理アドバイス** (100-200文字)
   - Claude生成のアドバイス

**フッター**: 生成日時

---
