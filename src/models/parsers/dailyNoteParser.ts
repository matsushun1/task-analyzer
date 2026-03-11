import type { BulletedListItemBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { BlockWithChildren } from '../types/block.types'
import type { DailyNoteData } from '../types/dailyNote.types'

type SectionKey = 'todayTasks' | 'nextTasks' | 'issues' | 'healthStatus'

type SectionCollections = {
  todayTasks: string[]
  nextTasks: string[]
  issues: string[]
  healthLines: string[]
}

const SECTION_PATTERN = /^【.+】$/
const BULLET_PREFIX = '・'

const SECTION_MAP: Record<string, SectionKey> = {
  '【今日行ったこと】': 'todayTasks',
  '【翌営業日に行うこと】': 'nextTasks',
  '【課題・懸念事項】': 'issues',
  '【健康状態】': 'healthStatus',
}

type BulletBlock = BulletedListItemBlockObjectResponse & { children: BlockWithChildren[] }

const isBulletBlock = (block: BlockWithChildren): block is BulletBlock =>
  block.type === 'bulleted_list_item'

const isParagraphBlock = (block: BlockWithChildren): boolean => block.type === 'paragraph'

const extractBulletText = (block: BulletBlock): string =>
  block.bulleted_list_item.rich_text.map((t) => t.plain_text).join('')

const extractParagraphText = (block: BlockWithChildren): string => {
  const b = block as BlockWithChildren & {
    paragraph: { rich_text: Array<{ plain_text: string }> }
  }
  return b.paragraph.rich_text.map((t) => t.plain_text).join('')
}

const collectBulletLines = (block: BulletBlock, depth: number, lines: string[]): void => {
  lines.push('  '.repeat(depth) + extractBulletText(block))
  for (const child of block.children) {
    if (isBulletBlock(child)) {
      collectBulletLines(child, depth + 1, lines)
    }
  }
}

const appendToSection = (
  line: string,
  section: SectionKey,
  collections: SectionCollections,
): void => {
  switch (section) {
    case 'todayTasks':
      collections.todayTasks.push(line)
      break
    case 'nextTasks':
      collections.nextTasks.push(line)
      break
    case 'issues':
      collections.issues.push(line)
      break
    case 'healthStatus':
      collections.healthLines.push(line)
      break
  }
}

const processParagraphBlock = (
  block: BlockWithChildren,
  collections: SectionCollections,
): void => {
  const rawText = extractParagraphText(block)
  let currentSection: SectionKey | null = null

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue

    if (SECTION_PATTERN.test(line)) {
      currentSection = SECTION_MAP[line] ?? null
      continue
    }

    if (currentSection === null) continue

    const content = line.startsWith(BULLET_PREFIX) ? line.slice(BULLET_PREFIX.length) : line
    appendToSection(content, currentSection, collections)
  }
}

export const parseDailyNoteBlocks = (blocks: BlockWithChildren[]): Omit<DailyNoteData, 'date'> => {
  const collections: SectionCollections = {
    todayTasks: [],
    nextTasks: [],
    issues: [],
    healthLines: [],
  }

  let currentSection: SectionKey | null = null

  for (const block of blocks) {
    if (isParagraphBlock(block)) {
      processParagraphBlock(block, collections)
      continue
    }

    if (!isBulletBlock(block)) continue

    const text = extractBulletText(block)
    if (SECTION_PATTERN.test(text)) {
      currentSection = SECTION_MAP[text] ?? null
      continue
    }

    if (currentSection === null) continue

    switch (currentSection) {
      case 'todayTasks':
        collectBulletLines(block, 0, collections.todayTasks)
        break
      case 'nextTasks':
        collectBulletLines(block, 0, collections.nextTasks)
        break
      case 'issues':
        collectBulletLines(block, 0, collections.issues)
        break
      case 'healthStatus':
        collections.healthLines.push(text)
        break
    }
  }

  return {
    todayTasks: collections.todayTasks,
    nextTasks: collections.nextTasks,
    issues: collections.issues,
    healthStatus: collections.healthLines.join('\n'),
  }
}
