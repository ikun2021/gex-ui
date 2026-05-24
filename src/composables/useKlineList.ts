import { onUnmounted, ref, watch } from 'vue'
import { ApiError } from '@/api'
import {
  buildKlineWsTopic,
  mergeWsKlineIntoList,
  parseWsKlineMessage,
  wsKlinePayloadToItem,
} from '@/api/klineWs'
import { getGexWs } from '@/api/ws'
import {
  calcKlineChangePct,
  getDepthSymbol,
  getKlineList,
  resolveKlineType,
  type KlineItem,
} from '@/api/quotes'

export function useKlineList(
  getSymbol: () => string,
  getTimeframe: () => string,
) {
  const klineItems = ref<KlineItem[]>([])
  const lastClose = ref('')
  const changePct = ref('')
  const loading = ref(false)
  const error = ref('')

  const ws = getGexWs()
  let subscribedTopic = ''

  function applyKlineList(sorted: KlineItem[]) {
    klineItems.value = sorted
    lastClose.value = sorted.length ? sorted[sorted.length - 1]!.close : ''
    changePct.value = calcKlineChangePct(sorted)
  }

  function onWsMessage(raw: unknown) {
    const msg = parseWsKlineMessage(raw)
    if (!msg || msg.t !== subscribedTopic)
      return
    const item = wsKlinePayloadToItem(msg.p)
    const merged = mergeWsKlineIntoList(klineItems.value, item)
    if (merged !== klineItems.value)
      applyKlineList(merged)
  }

  async function subscribeKlineWs() {
    const topic = buildKlineWsTopic(
      getDepthSymbol(getSymbol()),
      getTimeframe(),
    )
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
      /* WS 失败时仍可用 HTTP K 线 */
    }
  }

  function unsubscribeKlineWs() {
    if (subscribedTopic) {
      ws.unsubscribe(subscribedTopic)
      subscribedTopic = ''
    }
  }

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const { kline_list } = await getKlineList({
        symbol: getDepthSymbol(getSymbol()),
        kline_type: resolveKlineType(getTimeframe()),
        start_time: 0,
        end_time: Date.now(),
      })

      const sorted = [...(kline_list ?? [])].sort(
        (a, b) => a.start_time - b.start_time,
      )
      applyKlineList(sorted)
      await subscribeKlineWs()
    }
    catch (e) {
      klineItems.value = []
      lastClose.value = ''
      changePct.value = ''
      error.value = e instanceof ApiError ? e.message : 'K线加载失败'
      unsubscribeKlineWs()
    }
    finally {
      loading.value = false
    }
  }

  ws.addListener(onWsMessage)

  watch(
    () => [getSymbol(), getTimeframe()] as const,
    () => {
      void load()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    ws.removeListener(onWsMessage)
    unsubscribeKlineWs()
  })

  return {
    klineItems,
    lastClose,
    changePct,
    loading,
    error,
    load,
  }
}
