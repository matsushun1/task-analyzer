import type { BlockWithChildren } from '../../../src/models/types/block.types'
import { buildTaskData } from '../../../src/models/task.model'
import type { NotionTask } from '../../../src/models/types/task.types'

const makeNotionTask = (overrides: Partial<NotionTask> = {}): NotionTask => ({
  id: 'task-id-1',
  properties: {
    Name: { title: [{ plain_text: 'テストタスク' }] },
    Status: { select: { name: 'Doing' } },
    'Date Created': { created_time: '2026-03-01T00:00:00.000Z' },
  },
  ...overrides,
})

const makeTodoBlock = (
  name: string,
  checked: boolean,
  children: BlockWithChildren[] = []
): BlockWithChildren =>
  ({
    id: `todo-${name}`,
    type: 'to_do',
    has_children: children.length > 0,
    to_do: { rich_text: [{ plain_text: name }], checked },
    children,
  }) as unknown as BlockWithChildren

const makeBulletBlock = (text: string, children: BlockWithChildren[] = []): BlockWithChildren =>
  ({
    id: `bullet-${text}`,
    type: 'bulleted_list_item',
    has_children: children.length > 0,
    bulleted_list_item: { rich_text: [{ plain_text: text }] },
    children,
  }) as unknown as BlockWithChildren

const makeToggleBlock = (text: string, children: BlockWithChildren[] = []): BlockWithChildren =>
  ({
    id: `toggle-${text}`,
    type: 'toggle',
    has_children: children.length > 0,
    toggle: { rich_text: [{ plain_text: text }] },
    children,
  }) as unknown as BlockWithChildren

describe('buildTaskData', () => {
  describe('基本的なタスク変換', () => {
    it('NotionTaskの基本情報をTaskDataに変換する', () => {
      const task = makeNotionTask()

      const result = buildTaskData(task, [])

      expect(result.id).toBe('task-id-1')
      expect(result.name).toBe('テストタスク')
      expect(result.status).toBe('Doing')
      expect(result.createdAt).toEqual(new Date('2026-03-01T00:00:00.000Z'))
    })

    it('ブロックが空のとき subTasks は空配列', () => {
      const task = makeNotionTask()

      const result = buildTaskData(task, [])

      expect(result.subTasks).toEqual([])
    })

    it('ブロックが空のとき deadline は undefined', () => {
      const task = makeNotionTask()

      const result = buildTaskData(task, [])

      expect(result.deadline).toBeUndefined()
    })
  })

  describe('サブタスクの変換', () => {
    it('checked=false の to_do ブロックを SubTaskData に変換する', () => {
      const task = makeNotionTask()
      const blocks = [makeTodoBlock('サブタスク1', false)]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks).toHaveLength(1)
      expect(result.subTasks[0].name).toBe('サブタスク1')
    })

    it('checked=true の to_do ブロックは除外する', () => {
      const task = makeNotionTask()
      const blocks = [makeTodoBlock('完了済みサブタスク', true)]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks).toHaveLength(0)
    })

    it('checked=false と checked=true が混在するとき未完了のみ返す', () => {
      const task = makeNotionTask()
      const blocks = [
        makeTodoBlock('未完了', false),
        makeTodoBlock('完了済み', true),
        makeTodoBlock('未完了2', false),
      ]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks).toHaveLength(2)
      expect(result.subTasks[0].name).toBe('未完了')
      expect(result.subTasks[1].name).toBe('未完了2')
    })

    it('to_do 以外のブロックは subTasks に含めない', () => {
      const task = makeNotionTask()
      const blocks = [makeBulletBlock('箇条書き')]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks).toHaveLength(0)
    })
  })

  describe('期限の抽出', () => {
    it('"期限：MM/DD" 形式の bulleted_list_item から期限を抽出する', () => {
      const task = makeNotionTask()
      const deadlineBlock = makeBulletBlock('期限：2/20')
      const blocks = [makeTodoBlock('サブタスク', false, [deadlineBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].deadline).toBe('2/20')
    })

    it('"期限：○月下旬" 形式の期限を抽出する', () => {
      const task = makeNotionTask()
      const deadlineBlock = makeBulletBlock('期限：2月下旬')
      const blocks = [makeTodoBlock('サブタスク', false, [deadlineBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].deadline).toBe('2月下旬')
    })

    it('期限がないとき SubTaskData.deadline は undefined', () => {
      const task = makeNotionTask()
      const blocks = [makeTodoBlock('サブタスク', false)]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].deadline).toBeUndefined()
    })
  })

  describe('詳細テキストの収集', () => {
    it('to_do ブロックの子 bulleted_list_item から詳細テキストを収集する', () => {
      const task = makeNotionTask()
      const detailBlock = makeBulletBlock('詳細テキスト1')
      const blocks = [makeTodoBlock('サブタスク', false, [detailBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).toContain('詳細テキスト1')
    })

    it('期限ブロックは details に含めない', () => {
      const task = makeNotionTask()
      const deadlineBlock = makeBulletBlock('期限：2/20')
      const detailBlock = makeBulletBlock('詳細テキスト')
      const blocks = [makeTodoBlock('サブタスク', false, [deadlineBlock, detailBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).not.toContain('期限：2/20')
      expect(result.subTasks[0].details).toContain('詳細テキスト')
    })

    it('子ブロックがないとき details は空配列', () => {
      const task = makeNotionTask()
      const blocks = [makeTodoBlock('サブタスク', false)]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).toEqual([])
    })

    it('toggle ブロック配下の bulleted_list_item を details に収集する', () => {
      const task = makeNotionTask()
      const toggleBlock = makeToggleBlock('詳細', [
        makeBulletBlock('新規：デフォルトでオンのまま'),
        makeBulletBlock('既存：手動でオフにする'),
      ])
      const blocks = [makeTodoBlock('サブタスク', false, [toggleBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).toContain('新規：デフォルトでオンのまま')
      expect(result.subTasks[0].details).toContain('既存：手動でオフにする')
    })

    it('toggle ブロック配下の to_do を details に収集する', () => {
      const task = makeNotionTask()
      const toggleBlock = makeToggleBlock('詳細', [
        makeTodoBlock('詳細タスクA', false),
        makeTodoBlock('詳細タスクB', false),
      ])
      const blocks = [makeTodoBlock('サブタスク', false, [toggleBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).toContain('詳細タスクA')
      expect(result.subTasks[0].details).toContain('詳細タスクB')
    })

    it('toggle ブロック自身のテキストは details に含めない', () => {
      const task = makeNotionTask()
      const toggleBlock = makeToggleBlock('詳細', [makeBulletBlock('詳細内容')])
      const blocks = [makeTodoBlock('サブタスク', false, [toggleBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).not.toContain('詳細')
      expect(result.subTasks[0].details).toContain('詳細内容')
    })

    it('toggle ブロック配下の checked=true の to_do は details に含めない', () => {
      const task = makeNotionTask()
      const toggleBlock = makeToggleBlock('詳細', [
        makeTodoBlock('完了済み詳細', true),
        makeTodoBlock('未完了詳細', false),
      ])
      const blocks = [makeTodoBlock('サブタスク', false, [toggleBlock])]

      const result = buildTaskData(task, blocks)

      expect(result.subTasks[0].details).not.toContain('完了済み詳細')
      expect(result.subTasks[0].details).toContain('未完了詳細')
    })
  })
})
