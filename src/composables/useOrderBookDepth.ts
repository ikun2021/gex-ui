import { onUnmounted, ref, watch } from 'vue'
import { ApiError } from '@/api'
import {
  applyDepthSideDelta,
  buildDepthWsTopic,
  depthLevelsFromMap,
  isDepthVersionMatched,
  levelsToDepthMap,
  parseWsDepthMessage,
  trimDepthLevels,
} from '@/api/depthWs'
import { getGexWs } from '@/api/ws'
import {
  calcBookMidPrice,
  DEFAULT_DEPTH_LEVEL,
  getDepth,
  getDepthSymbol,
  mapDepthToOrderBook,
  type DepthLevel,
  type OrderBookRow,
} from '@/api/quotes'

export function useOrderBookDepth(
  getSymbol: () => string,
  level = DEFAULT_DEPTH_LEVEL,
) {
  const asks = ref<OrderBookRow[]>([])
  const bids = ref<OrderBookRow[]>([])
  const midPrice = ref('')
  const loading = ref(false)
  const error = ref('')

  const ws = getGexWs()
  let subscribedTopic = ''
  /** HTTP 快照或上一笔 WS 推送的 cv，下一笔 WS 的 lv 必须等于它 */
  let currentVersion = ''
  let resyncing = false
  const askBook = new Map<string, DepthLevel>()
  const bidBook = new Map<string, DepthLevel>()

  function publishBook() {
    const askLevels = trimDepthLevels(depthLevelsFromMap(askBook), level)
    const bidLevels = trimDepthLevels(depthLevelsFromMap(bidBook), level)
    const mapped = mapDepthToOrderBook(askLevels, bidLevels)
    asks.value = mapped.asks
    bids.value = mapped.bids
    midPrice.value = calcBookMidPrice(askLevels, bidLevels)
  }

  function resetBook(
    askLevels: DepthLevel[],
    bidLevels: DepthLevel[],
    version: number | string,
  ) {
    askBook.clear()
    bidBook.clear()
    for (const [price, item] of levelsToDepthMap(askLevels))
      askBook.set(price, item)
    for (const [price, item] of levelsToDepthMap(bidLevels))
      bidBook.set(price, item)
    currentVersion = String(version)
    publishBook()
  }

  async function resyncFromHttp() {
    if (resyncing)
      return
    resyncing = true
    try {
      await loadSnapshot()
    }
    finally {
      resyncing = false
    }
  }

  function onWsMessage(raw: unknown) {
    const msg = parseWsDepthMessage(raw)
    if (!msg || msg.t !== subscribedTopic)
      return

    const payload = msg.p
    const symbol = getDepthSymbol(getSymbol())
    if (payload.s && payload.s !== symbol)
      return

    // 尚未完成 HTTP 快照，忽略 WS 增量
    if (!currentVersion)
      return

    // lv 必须等于本地上一版本 cv，否则全量重拉
    if (!isDepthVersionMatched(currentVersion, payload.lv)) {
      void resyncFromHttp()
      return
    }

    applyDepthSideDelta(askBook, payload.a ?? [])
    applyDepthSideDelta(bidBook, payload.b ?? [])
    currentVersion = payload.cv
    publishBook()
  }

  async function subscribeDepthWs() {
    const topic = buildDepthWsTopic(getDepthSymbol(getSymbol()))
    if (topic === subscribedTopic)
      return

    try {
      await ws.connect()
      if (subscribedTopic)
        ws.unsubscribe(subscribedTopic)
      subscribedTopic = topic
      ws.subscribe(topic)
    }
    catch {
      /* WS 失败时仍可用 HTTP 盘口 */
    }
  }

  function unsubscribeDepthWs() {
    if (subscribedTopic) {
      ws.unsubscribe(subscribedTopic)
      subscribedTopic = ''
    }
    currentVersion = ''
  }

  async function loadSnapshot() {
    const data = await getDepth(getDepthSymbol(getSymbol()), level)
    resetBook(data.asks ?? [], data.bids ?? [], data.version ?? 0)
    await subscribeDepthWs()
  }

  async function load() {
    loading.value = true
    error.value = ''

    try {
      await loadSnapshot()
    }
    catch (e) {
      askBook.clear()
      bidBook.clear()
      asks.value = []
      bids.value = []
      midPrice.value = ''
      currentVersion = ''
      error.value = e instanceof ApiError ? e.message : '盘口加载失败'
      unsubscribeDepthWs()
    }
    finally {
      loading.value = false
    }
  }

  ws.addListener(onWsMessage)

  watch(
    () => getSymbol(),
    () => {
      unsubscribeDepthWs()
      void load()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    ws.removeListener(onWsMessage)
    unsubscribeDepthWs()
  })

  return {
    asks,
    bids,
    midPrice,
    loading,
    error,
    load,
  }
}
