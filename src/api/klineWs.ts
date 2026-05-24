import { resolveKlineType, type KlineItem } from './quotes'

/** WebSocket 推送的 K 线 payload（与后端 common/proto/ws.Kline 一致） */
export interface WsKlinePayload {
  kt: number
  o: string
  h: string
  l: string
  c: string
  v: string
  a: string
  st: number
  et: number
  r: string
  s: string
}

export interface WsKlineMessage {
  t: string
  p: WsKlinePayload
}

/** kline_type 枚举值 → WS topic 后缀（如 Min1、Hour1） */
export const KLINE_TYPE_TO_WS_SUFFIX: Record<number, string> = {
  1: 'Min1',
  2: 'Min5',
  3: 'Min10',
  4: 'Min15',
  5: 'Min30',
  6: 'Hour1',
  7: 'Hour4',
  8: 'Day1',
  9: 'Week1',
  10: 'Month1',
}

export function buildKlineWsTopic(symbolApi: string, timeframe: string) {
  const kt = resolveKlineType(timeframe)
  const suffix = KLINE_TYPE_TO_WS_SUFFIX[kt] ?? 'Min1'
  return `kline@${symbolApi}@${suffix}`
}

export function wsKlinePayloadToItem(p: WsKlinePayload): KlineItem {
  return {
    open: p.o,
    high: p.h,
    low: p.l,
    close: p.c,
    volume: p.v,
    amount: p.a,
    start_time: p.st,
    end_time: p.et,
    price_range: p.r,
    symbol: p.s,
  }
}

export function parseWsKlineMessage(raw: unknown): WsKlineMessage | null {
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
  if (typeof msg.t !== 'string' || !msg.t.startsWith('kline@'))
    return null
  if (typeof msg.p !== 'object' || msg.p === null)
    return null
  return msg as unknown as WsKlineMessage
}

/** 用 WS 推送更新本地 K 线列表（更新最后一根或追加新根） */
export function mergeWsKlineIntoList(
  items: KlineItem[],
  update: KlineItem,
): KlineItem[] {
  if (items.length === 0)
    return [update]

  const last = items[items.length - 1]!
  if (last.start_time === update.start_time) {
    return [...items.slice(0, -1), update]
  }
  if (update.start_time > last.start_time) {
    return [...items, update]
  }

  const idx = items.findIndex(k => k.start_time === update.start_time)
  if (idx >= 0) {
    const next = [...items]
    next[idx] = update
    return next
  }
  return items
}
