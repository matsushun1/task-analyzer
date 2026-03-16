import {
  extractWorkload,
  removeWorkload,
  extractTotalWorkload,
} from '../../../../models/parsers/workloadParser'

describe('extractWorkload', () => {
  describe('工数表記がある場合', () => {
    it('整数時間「（3H）」→ 3', () => {
      expect(extractWorkload('（3H）')).toBe(3)
    })

    it('小数時間「（4.5H）」→ 4.5', () => {
      expect(extractWorkload('（4.5H）')).toBe(4.5)
    })

    it('テキスト末尾「発表準備（3H）」→ 3', () => {
      expect(extractWorkload('発表準備（3H）')).toBe(3)
    })

    it('テキスト途中「（3H）作業」→ 3', () => {
      expect(extractWorkload('（3H）作業')).toBe(3)
    })

    it('複数括弧「予約機能実装（フェーズ2）（3H）」→ 3（工数以外の括弧は無視）', () => {
      expect(extractWorkload('予約機能実装（フェーズ2）（3H）')).toBe(3)
    })

    it('1行に複数の工数表記「（1H）作業（2H）」→ 3（合計を返す）', () => {
      expect(extractWorkload('（1H）作業（2H）')).toBe(3)
    })
  })

  describe('工数表記がない場合', () => {
    it('工数なし「デイリースクラム」→ null', () => {
      expect(extractWorkload('デイリースクラム')).toBeNull()
    })

    it('空文字 "" → null', () => {
      expect(extractWorkload('')).toBeNull()
    })

    it('半角括弧 "(3H)" → null（全角のみ対象）', () => {
      expect(extractWorkload('(3H)')).toBeNull()
    })

    it('小文字「（3h）」→ null（大文字Hのみ対象）', () => {
      expect(extractWorkload('（3h）')).toBeNull()
    })

    it('「（H）」数値なし → null', () => {
      expect(extractWorkload('（H）')).toBeNull()
    })
  })
})

describe('removeWorkload', () => {
  it('「発表準備（3H）」→ 「発表準備」', () => {
    expect(removeWorkload('発表準備（3H）')).toBe('発表準備')
  })

  it('「予約登録APIの開発（4.5H）」→ 「予約登録APIの開発」', () => {
    expect(removeWorkload('予約登録APIの開発（4.5H）')).toBe('予約登録APIの開発')
  })

  it('「（3H）」のみ → 空文字', () => {
    expect(removeWorkload('（3H）')).toBe('')
  })

  it('複数括弧「予約機能実装（フェーズ2）（3H）」→ 「予約機能実装（フェーズ2）」', () => {
    expect(removeWorkload('予約機能実装（フェーズ2）（3H）')).toBe('予約機能実装（フェーズ2）')
  })

  it('工数なし → そのまま返す', () => {
    expect(removeWorkload('デイリースクラム')).toBe('デイリースクラム')
  })

  it('インデント付き「  タスク（4.5H）」→ 「  タスク」（先頭スペース保持）', () => {
    expect(removeWorkload('  タスク（4.5H）')).toBe('  タスク')
  })

  it('1行に複数の工数表記「（1H）作業（2H）」→ すべて削除', () => {
    expect(removeWorkload('（1H）作業（2H）')).toBe('作業')
  })
})

describe('extractTotalWorkload', () => {
  it("['発表準備（3H）', '予約登録APIの開発（4.5H）'] → 7.5", () => {
    expect(extractTotalWorkload(['発表準備（3H）', '予約登録APIの開発（4.5H）'])).toBe(7.5)
  })

  it("['デイリースクラム', '（3H）作業'] → 3（工数なしは 0 として加算）", () => {
    expect(extractTotalWorkload(['デイリースクラム', '（3H）作業'])).toBe(3)
  })

  it('全タスク工数なし → 0', () => {
    expect(extractTotalWorkload(['デイリースクラム', 'ミーティング'])).toBe(0)
  })

  it('空配列 → 0', () => {
    expect(extractTotalWorkload([])).toBe(0)
  })

  it('インデント付き行も集計対象', () => {
    expect(extractTotalWorkload(['2.0.1', '  予約登録APIの開発（4.5H）'])).toBe(4.5)
  })

  it('浮動小数点誤差を回避: 0.1H + 0.2H → 0.3（誤差なし）', () => {
    expect(extractTotalWorkload(['タスク（0.1H）', 'タスク（0.2H）'])).toBe(0.3)
  })
})
