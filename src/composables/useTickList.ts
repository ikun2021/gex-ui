import { onUnmounted, ref } from 'vue'
import { ApiError } from '@/api'
import {
  DEFAULT_TICK_LIMIT,
  getDepthSymbol,
  getTickList,
  mapTickListToTradeRows,
  type TradeRow,
} from '@/api/quotes'

const TICK_POLL_MS = 3000

export function useTickList(
  getSymbol: () => string,
  limit = DEFAULT_TICK_LIMIT,
) {
  const trades = ref<TradeRow[]>([])
  const loading = ref(false)
  const error = ref('')
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const { tick_list } = await getTickList(getDepthSymbol(getSymbol()), limit)
      trades.value = mapTickListToTradeRows(tick_list ?? [])
    }
    catch (e) {
      trades.value = []
      error.value = e instanceof ApiError ? e.message : '最新成交加载失败'
    }
    finally {
      loading.value = false
    }
  }

  function startPoll() {
    stopPoll()
    pollTimer = setInterval(() => {
      void load()
    }, TICK_POLL_MS)
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  onUnmounted(stopPoll)

  return {
    trades,
    loading,
    error,
    load,
    startPoll,
    stopPoll,
  }
}
