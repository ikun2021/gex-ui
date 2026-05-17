import { post } from './request'

/** 订单方向：1 买入，2 卖出 */
export const ORDER_SIDE = {
  BUY: 1,
  SELL: 2,
} as const

/** 订单类型：1 市价，2 限价，3 FOK */
export const ORDER_TYPE = {
  MO: 1,
  LO: 2,
  FOK: 3,
} as const

/**
 * 订单状态（与后端 OrderStatus 枚举一致）
 * 0 UnknownOrderStatus 未知
 * 1 NewCreated         新建未成交
 * 2 PartFilled         部分成交
 * 3 ALLFilled          全部成交
 * 4 Canceled           撤销
 * 5 Wasted             废弃
 */
export const ORDER_STATUS = {
  UNKNOWN: 0,
  NEW_CREATED: 1,
  PART_FILLED: 2,
  ALL_FILLED: 3,
  CANCELED: 4,
  WASTED: 5,
} as const

/** 当前委托：未完结订单 */
export const CURRENT_ORDER_STATUS_LIST = [
  ORDER_STATUS.NEW_CREATED,
  ORDER_STATUS.PART_FILLED,
] as const

/** 历史委托：已完结订单 */
export const HISTORY_ORDER_STATUS_LIST = [
  ORDER_STATUS.ALL_FILLED,
  ORDER_STATUS.CANCELED,
  ORDER_STATUS.WASTED,
] as const

export interface GetOrderListParams {
  id?: string
  page_size?: number
  status_list: number[]
  symbol_name: string
}

export interface OrderItem {
  id: string
  order_id: string
  user_id: number
  symbol_name: string
  price: string
  base_amount: string
  quote_amount: string
  side: number
  status: number
  order_type: number
  filled_base_amount: string
  filled_quote_amount: string
  filled_avg_price: string
  created_at: number
}

export interface GetOrderListResult {
  order_list: OrderItem[]
  total: number
}

/** 表格展示用行 */
export interface OrderTableRow {
  id: string
  orderId: string
  time: string
  symbol: string
  side: string
  sideIsBuy: boolean
  price: string
  qty: string
  total: string
  filled: string
  status: string
}

const SIDE_LABEL: Record<number, string> = {
  [ORDER_SIDE.BUY]: '买入',
  [ORDER_SIDE.SELL]: '卖出',
}

const STATUS_LABEL: Record<number, string> = {
  [ORDER_STATUS.UNKNOWN]: '未知',
  [ORDER_STATUS.NEW_CREATED]: '新建未成交',
  [ORDER_STATUS.PART_FILLED]: '部分成交',
  [ORDER_STATUS.ALL_FILLED]: '全部成交',
  [ORDER_STATUS.CANCELED]: '撤销',
  [ORDER_STATUS.WASTED]: '废弃',
}

export function symbolToApi(display: string) {
  return display.replace('/', '_').toUpperCase()
}

export function symbolToDisplay(apiName: string) {
  return apiName.replace('_', '/')
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatAmount(value: string) {
  const n = Number(value)
  if (Number.isNaN(n))
    return value
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

function resolveStatusLabel(order: OrderItem): string {
  return STATUS_LABEL[order.status] ?? `未知状态(${order.status})`
}

export function mapOrderToTableRow(order: OrderItem): OrderTableRow {
  const filled = Number(order.filled_base_amount)
  const total = Number(order.base_amount)
  const remaining = Math.max(0, total - filled)

  return {
    id: order.id,
    orderId: order.order_id,
    time: formatTime(order.created_at),
    symbol: symbolToDisplay(order.symbol_name),
    side: SIDE_LABEL[order.side] ?? `方向${order.side}`,
    sideIsBuy: order.side === ORDER_SIDE.BUY,
    price: formatAmount(order.price),
    qty: formatAmount(order.base_amount),
    total: formatAmount(order.quote_amount),
    filled: `${formatAmount(order.filled_base_amount)} / ${formatAmount(String(remaining))}`,
    status: resolveStatusLabel(order),
  }
}

/** 每页条数（加载更多） */
export const ORDER_PAGE_SIZE = 5

export interface FetchOrderPageResult {
  rows: OrderTableRow[]
  total: number
  hasMore: boolean
}

export interface CreateOrderParams {
  base_amount: string
  order_type: number
  price: string
  quote_amount: string
  side: number
  symbol_name: string
}

function multiplyDecimal(price: string, baseAmount: string): string {
  const p = Number(price)
  const b = Number(baseAmount)
  if (Number.isNaN(p) || Number.isNaN(b))
    return '0'
  return String(p * b)
}

/** 组装下单请求体（限价需 price；市价 price 传 "0"） */
export function buildCreateOrderPayload(input: {
  symbolDisplay: string
  side: typeof ORDER_SIDE.BUY | typeof ORDER_SIDE.SELL
  orderType: typeof ORDER_TYPE.LO | typeof ORDER_TYPE.MO
  price: string
  baseAmount: string
}): CreateOrderParams {
  const base_amount = input.baseAmount.trim()
  const isMarket = input.orderType === ORDER_TYPE.MO
  const price = isMarket ? '0' : input.price.trim()
  const quote_amount = isMarket
    ? '0'
    : multiplyDecimal(price, base_amount)

  return {
    symbol_name: symbolToApi(input.symbolDisplay),
    side: input.side,
    order_type: input.orderType,
    price,
    base_amount,
    quote_amount,
  }
}

export function createOrder(params: CreateOrderParams) {
  return post<Record<string, never>>('/order/v1/create_order', params)
}

export function getOrderList(params: GetOrderListParams) {
  return post<GetOrderListResult>('/order/v1/get_order_list', {
    id: params.id ?? '0',
    page_size: params.page_size ?? ORDER_PAGE_SIZE,
    status_list: params.status_list,
    symbol_name: params.symbol_name,
  })
}

/**
 * 游标分页拉取订单
 * @param cursorId 首页传 "0"，下一页传上一页最后一条的 id
 * @param alreadyLoaded 已加载条数，用于结合 total 判断是否还有更多
 */
export async function fetchOrderPage(
  symbolDisplay: string,
  statusList: readonly number[],
  cursorId = '0',
  alreadyLoaded = 0,
  pageSize = ORDER_PAGE_SIZE,
): Promise<FetchOrderPageResult> {
  const { order_list, total } = await getOrderList({
    symbol_name: symbolToApi(symbolDisplay),
    status_list: [...statusList],
    id: cursorId,
    page_size: pageSize,
  })

  const rows = order_list.map(mapOrderToTableRow)
  const loadedCount = alreadyLoaded + rows.length

  const hasMore = total > 0
    ? loadedCount < total
    : rows.length >= pageSize

  return { rows, total, hasMore }
}
