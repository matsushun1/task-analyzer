import type { BlockWithChildren } from '../../../../src/models/types/block.types'
import { parseDailyNoteBlocks } from '../../../../src/models/parsers/dailyNoteParser'

const makeBulletBlock = (text: string, children: BlockWithChildren[] = []): BlockWithChildren =>
  ({
    id: `bullet-${text}`,
    type: 'bulleted_list_item',
    has_children: children.length > 0,
    bulleted_list_item: { rich_text: [{ plain_text: text }] },
    children,
  }) as unknown as BlockWithChildren

describe('parseDailyNoteBlocks', () => {
  describe('ブロックが空のとき', () => {
    it('todayTasks は空配列', () => {
      const result = parseDailyNoteBlocks([])
      expect(result.todayTasks).toEqual([])
    })

    it('nextTasks は空配列', () => {
      const result = parseDailyNoteBlocks([])
      expect(result.nextTasks).toEqual([])
    })

    it('issues は空配列', () => {
      const result = parseDailyNoteBlocks([])
      expect(result.issues).toEqual([])
    })

    it('healthStatus は空文字', () => {
      const result = parseDailyNoteBlocks([])
      expect(result.healthStatus).toBe('')
    })
  })

  describe('セクション区切りの検出', () => {
    it('【今日行ったこと】のブロックをセクション区切りとして認識する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('タスクA'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toContain('タスクA')
    })

    it('セクション見出しブロック自身はコンテンツに含めない', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('タスクA'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).not.toContain('【今日行ったこと】')
    })

    it('セクションが存在しないとき todayTasks は空配列', () => {
      const blocks = [makeBulletBlock('セクションなし')]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual([])
    })
  })

  describe('【今日行ったこと】セクション', () => {
    it('配下のブロックテキストを todayTasks に収集する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('デイリースクラム'),
        makeBulletBlock('発表準備'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual(['デイリースクラム', '発表準備'])
    })

    it('工数情報（3H）を含むテキストもそのまま収集する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('発表準備（3H）'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toContain('発表準備（3H）')
    })

    it('次のセクション以降のブロックは todayTasks に含めない', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('今日のタスク'),
        makeBulletBlock('【翌営業日に行うこと】'),
        makeBulletBlock('明日のタスク'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual(['今日のタスク'])
      expect(result.todayTasks).not.toContain('明日のタスク')
    })
  })

  describe('【翌営業日に行うこと】セクション', () => {
    it('配下のブロックテキストを nextTasks に収集する', () => {
      const blocks = [
        makeBulletBlock('【翌営業日に行うこと】'),
        makeBulletBlock('デイリースクラム'),
        makeBulletBlock('PR対応'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.nextTasks).toEqual(['デイリースクラム', 'PR対応'])
    })
  })

  describe('【課題・懸念事項】セクション', () => {
    it('配下のブロックテキストを issues に収集する', () => {
      const blocks = [
        makeBulletBlock('【課題・懸念事項】'),
        makeBulletBlock('テスト期間が短い'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.issues).toEqual(['テスト期間が短い'])
    })
  })

  describe('【健康状態】セクション', () => {
    it('配下のブロックテキストを healthStatus に収集する', () => {
      const blocks = [
        makeBulletBlock('【健康状態】'),
        makeBulletBlock('良好'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.healthStatus).toBe('良好')
    })

    it('複数行は改行区切りで1つの文字列にまとめる', () => {
      const blocks = [
        makeBulletBlock('【健康状態】'),
        makeBulletBlock('やや疲れ気味'),
        makeBulletBlock('睡眠不足'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.healthStatus).toBe('やや疲れ気味\n睡眠不足')
    })

    it('配下のブロックがないとき healthStatus は空文字', () => {
      const blocks = [makeBulletBlock('【健康状態】')]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.healthStatus).toBe('')
    })
  })

  describe('ネストした子ブロックの収集', () => {
    it('子 bulleted_list_item のテキストを2スペースインデント付きで収集する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('2.0.1', [
          makeBulletBlock('予約登録APIの開発（4.5H）'),
        ]),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual(['2.0.1', '  予約登録APIの開発（4.5H）'])
    })

    it('孫 bulleted_list_item のテキストを4スペースインデント付きで収集する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('2.0.1', [
          makeBulletBlock('予約登録APIの開発（4.5H）', [
            makeBulletBlock('→実装、テスト仕様書作成'),
          ]),
        ]),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual([
        '2.0.1',
        '  予約登録APIの開発（4.5H）',
        '    →実装、テスト仕様書作成',
      ])
    })

    it('子ブロックのないブロックとネストしたブロックが混在する場合も正しく収集する', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('デイリースクラム'),
        makeBulletBlock('2.0.1', [
          makeBulletBlock('予約登録APIの開発（4.5H）'),
        ]),
        makeBulletBlock('発表準備（3H）'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual([
        'デイリースクラム',
        '2.0.1',
        '  予約登録APIの開発（4.5H）',
        '発表準備（3H）',
      ])
    })

    it('nextTasks でも子ブロックをインデント付きで収集する', () => {
      const blocks = [
        makeBulletBlock('【翌営業日に行うこと】'),
        makeBulletBlock('2.0.1', [
          makeBulletBlock('実装PRレビュー依頼'),
        ]),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.nextTasks).toEqual(['2.0.1', '  実装PRレビュー依頼'])
    })
  })

  describe('複数セクションが混在するとき', () => {
    it('各セクションのコンテンツを正しく振り分ける', () => {
      const blocks = [
        makeBulletBlock('【今日行ったこと】'),
        makeBulletBlock('作業A'),
        makeBulletBlock('【翌営業日に行うこと】'),
        makeBulletBlock('作業B'),
        makeBulletBlock('【課題・懸念事項】'),
        makeBulletBlock('課題X'),
        makeBulletBlock('【健康状態】'),
        makeBulletBlock('良好'),
      ]

      const result = parseDailyNoteBlocks(blocks)

      expect(result.todayTasks).toEqual(['作業A'])
      expect(result.nextTasks).toEqual(['作業B'])
      expect(result.issues).toEqual(['課題X'])
      expect(result.healthStatus).toBe('良好')
    })
  })

  describe('paragraph ブロック（本文全体が1つのブロック）のとき', () => {
    const makeParagraphBlock = (text: string): BlockWithChildren =>
      ({
        id: `paragraph-${text}`,
        type: 'paragraph',
        has_children: false,
        paragraph: { rich_text: [{ plain_text: text }] },
        children: [],
      }) as unknown as BlockWithChildren

    it('全セクションのコンテンツを正しく振り分ける', () => {
      const text = [
        '【今日行ったこと】',
        '・デイリースクラム',
        '・発表準備（3H）',
        '【翌営業日に行うこと】',
        '・デイリースクラム',
        '・定例',
        '【課題・懸念事項】',
        '冬将軍',
        '【健康状態】',
        '咳（だいぶ良くなった）',
      ].join('\n')

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.todayTasks).toEqual(['デイリースクラム', '発表準備（3H）'])
      expect(result.nextTasks).toEqual(['デイリースクラム', '定例'])
      expect(result.issues).toEqual(['冬将軍'])
      expect(result.healthStatus).toBe('咳（だいぶ良くなった）')
    })

    it('・で始まる行の・を除去してコンテンツとして収集する', () => {
      const text = '【今日行ったこと】\n・タスクA\n・タスクB'

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.todayTasks).toEqual(['タスクA', 'タスクB'])
    })

    it('・で始まらない行もコンテンツとして収集する', () => {
      const text = '【課題・懸念事項】\nテスト期間が短い'

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.issues).toEqual(['テスト期間が短い'])
    })

    it('空行は無視する', () => {
      const text = '【今日行ったこと】\n\n・タスクA\n\n・タスクB'

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.todayTasks).toEqual(['タスクA', 'タスクB'])
    })

    it('セクション見出し行自身はコンテンツに含めない', () => {
      const text = '【今日行ったこと】\n・タスクA'

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.todayTasks).not.toContain('【今日行ったこと】')
    })

    it('healthStatus が複数行あるとき改行区切りの1文字列にまとめる', () => {
      const text = '【健康状態】\nやや疲れ気味\n睡眠不足'

      const result = parseDailyNoteBlocks([makeParagraphBlock(text)])

      expect(result.healthStatus).toBe('やや疲れ気味\n睡眠不足')
    })
  })
})
