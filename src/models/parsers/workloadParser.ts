// g フラグ付き: matchAll / replace で使う（exec は lastIndex がステートフルになるため使わない）
const WORKLOAD_PATTERN = /（(\d+(?:\.\d+)?)H）/g

export const extractWorkload = (text: string): number | null => {
  const matches = [...text.matchAll(WORKLOAD_PATTERN)]
  if (matches.length === 0) return null
  const total = matches.reduce((sum, m) => sum + parseFloat(m[1]), 0)
  return Math.round(total * 10) / 10
}

// 将来の利用（例: Claude プロンプトに工数除去済みのタスク名を渡す）に備えてエクスポートを維持する
export const removeWorkload = (text: string): string => {
  return text.replace(WORKLOAD_PATTERN, '').trimEnd()
}

export const extractTotalWorkload = (tasks: readonly string[]): number => {
  const sum = tasks.reduce((acc, task) => {
    const workload = extractWorkload(task)
    return acc + (workload ?? 0)
  }, 0)
  return Math.round(sum * 10) / 10
}
