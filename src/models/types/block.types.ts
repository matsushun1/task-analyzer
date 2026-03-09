import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export type BlockWithChildren = BlockObjectResponse & { children: BlockWithChildren[] }
