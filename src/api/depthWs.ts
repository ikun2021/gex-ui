import type { DepthLevel } from './quotes'

/** WebSocket 推送的盘口增量（与后端 common/proto/ws.Depth 一致） */
export interface WsDepthPayload {
  lv: string
  cv: string
  s: string
  /** [price, qty, amount] */
  a: string[][]
  b: string[][]
}

export interface WsDepthMessage {
  t: string
  p: WsDepthPayload
}

export function buildDepthWsTopic(symbolApi: string) {
  return `depth@${symbolApi}`
}

/** 本地已同步版本是否与 WS 推送的 lv 连续 */
export function isDepthVersionMatched(
  localVersion: string,
  wsLastVersion: string,
) {
  return localVersion !== '' && localVersion === wsLastVersion
}

export function parseWsDepthMessage(raw: unknown): WsDepthMessage | null {
  let data = raw
  if (typeof data === 'string') {
    const lower = data.toLowerCase()
    if (lower === 'pong' || lower === 'ping')
      return null
    try {
      data = JSON.parse(data) as unknown
    }
    catch {
      return null
    }
  }
  if (typeof data !== 'object' || data === null)
    return null
  const msg = data as Record<string, unknown>
  if (typeof msg.t !== 'string' || !msg.t.startsWith('depth@'))
    return null
  if (typeof msg.p !== 'object' || msg.p === null)
    return null
  return msg as unknown as WsDepthMessage
}

/** WS 档位 [price, qty, amount] → DepthLevel */
export function wsDepthRowToLevel(row: string[]): DepthLevel | null {
  const [price, qty, amount] = row
  if (!price)
    return null
  return {
    price,
    base_amount: qty ?? '0',
    quote_amount: amount ?? '',
  }
}

export function isEmptyDepthQty(qty: string) {
  const n = Number(qty)
  return qty === '' || qty === '0' || (!Number.isNaN(n) && n === 0)
}

/** 将增量档位合并进本地盘口 */
export function applyDepthSideDelta(
  book: Map<string, DepthLevel>,
  rows: string[][],
) {
  for (const row of rows) {
    const level = wsDepthRowToLevel(row)
    if (!level)
      continue
    if (isEmptyDepthQty(level.base_amount))
      book.delete(level.price)
    else
      book.set(level.price, level)
  }
}

export function depthLevelsFromMap(book: Map<string, DepthLevel>) {
  return [...book.values()]
}

export function trimDepthLevels(levels: DepthLevel[], limit: number) {
  return [...levels]
    .sort((a, b) => Number(b.price) - Number(a.price))
    .slice(0, limit)
}

export function levelsToDepthMap(levels: DepthLevel[]) {
  const book = new Map<string, DepthLevel>()
  for (const level of levels)
    book.set(level.price, level)
  return book
}
