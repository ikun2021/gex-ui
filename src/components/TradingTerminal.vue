<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, Search, Crosshair, Minus, PenLine } from 'lucide-vue-next'
import {
  CURRENT_ORDER_STATUS_LIST,
  HISTORY_ORDER_STATUS_LIST,
  ORDER_SIDE,
} from '@/api'
import { useCreateOrder } from '@/composables/useCreateOrder'
import { useOrderListPagination } from '@/composables/useOrderListPagination'
import { useUserAssets } from '@/composables/useUserAssets'
import OrderAssetBar from '@/components/OrderAssetBar.vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** OKX 常见涨跌色：绿涨红跌（国际版现货习惯） */
const okxUp = '#00d395'
const okxDown = '#f6465d'

/** 当前委托 / 历史委托共用：固定行高，避免「撤单」按钮与「—」占位高度不一致 */
const orderHeadRowClass =
  'border-border hover:bg-transparent border-b [&>th]:text-muted-foreground [&>th]:h-10 [&>th]:px-3 [&>th]:py-0 [&>th]:text-[11px] [&>th]:font-normal'
const orderBodyRowClass =
  'border-border hover:bg-muted/20 h-11 border-b [&>td]:h-11 [&>td]:max-h-11 [&>td]:min-h-11 [&>td]:!px-3 [&>td]:!py-0 [&>td]:align-middle [&>td]:leading-none'

const selectedPair = ref('IKUN/USDT')
const ordersTab = ref('open')
const orderTypeTab = ref('limit')
const tfActive = ref('15m')
const buySlider = ref([0])
const sellSlider = ref([0])

const buyPrice = ref('')
const sellPrice = ref('')
const buyAmount = ref('')
const sellAmount = ref('')
const marketBuyAmount = ref('')
const marketSellAmount = ref('')

const baseCurrency = computed(() => selectedPair.value.split('/')[0] ?? '')
const quoteCurrency = computed(() => selectedPair.value.split('/')[1] ?? 'USDT')

const {
  submitting: orderSubmitting,
  feedback: orderFeedback,
  feedbackOk: orderFeedbackOk,
  clearFeedback: clearOrderFeedback,
  submitLimit: submitLimitOrder,
  submitMarket: submitMarketOrder,
} = useCreateOrder()

const {
  list: assetList,
  loading: assetsLoading,
  error: assetsError,
  load: loadUserAssets,
  availableOf,
  frozenOf,
  showFrozen,
  formatAssetQty,
  hasFrozenQty,
} = useUserAssets()

interface AssetBarState {
  loading: boolean
  avail: string
  frozen: string
  coin: string
  showFrozen: boolean
}

/** 买卖表单资产条：依赖 assetList 确保接口返回后刷新 */
function buildAssetLine(coinName: string): AssetBarState {
  void assetList.value
  if (assetsLoading.value) {
    return {
      loading: true,
      avail: '',
      frozen: '',
      coin: coinName,
      showFrozen: false,
    }
  }
  const avail = formatAssetQty(availableOf(coinName))
  const frozen = formatAssetQty(frozenOf(coinName))
  return {
    loading: false,
    avail,
    frozen,
    coin: coinName,
    showFrozen: showFrozen(coinName),
  }
}

const quoteAsset = computed(() => buildAssetLine(quoteCurrency.value))
const baseAsset = computed(() => buildAssetLine(baseCurrency.value))

const maxBuyBaseDisplay = computed(() => {
  void assetList.value
  if (assetsLoading.value)
    return '…'
  const quote = Number(availableOf(quoteCurrency.value))
  const price = Number(buyPrice.value || lastPrice)
  if (Number.isNaN(quote) || !price || price <= 0)
    return '—'
  return formatAssetQty(String(quote / price))
})

const maxSellDisplay = computed(() => {
  void assetList.value
  return assetsLoading.value ? '…' : formatAssetQty(availableOf(baseCurrency.value))
})

const timeframes = ['分时', '1s', '1m', '5m', '15m', '1H', '4H', '1D', '1W']

const categories = ['自选', '现货', '合约', '热门', '涨幅榜', 'AI', 'Meme', 'DeFi', 'Layer1']

const marketPairs = [
  { sym: 'BTC/USDT', price: '97,842.1', chg: '+0.52%', up: true },
  { sym: 'ETH/USDT', price: '3,521.60', chg: '-0.18%', up: false },
  { sym: 'TON/USDT', price: '3.2840', chg: '+2.31%', up: true },
  { sym: 'SOL/USDT', price: '178.42', chg: '+1.05%', up: true },
  { sym: 'DOGE/USDT', price: '0.16241', chg: '-0.76%', up: false },
  { sym: 'XRP/USDT', price: '2.3184', chg: '+0.09%', up: true },
  { sym: 'PEPE/USDT', price: '0.00000982', chg: '+4.12%', up: true },
  { sym: 'IKUN/USDT', price: '1.0000', chg: '+0.00%', up: true },
]

const lastPrice = '3.2840'
const changePct = '+2.31%'

const statsRow = [
  { label: '标记价格', value: '3.2836' },
  { label: '指数价格', value: '3.2848' },
  { label: '24h 最低', value: '3.1021' },
  { label: '24h 最高', value: '3.3180' },
  { label: '24h 量 (TON)', value: '18.24M' },
  { label: '24h 额 (USDT)', value: '58.93M' },
]

const chartLabels = ['14:00', '18:00', '22:00', '02:00', '06:00', '10:00', '14:00']

const candles = [
  { o: 42, h: 58, l: 38, c: 52, up: true },
  { o: 52, h: 55, l: 40, c: 44, up: false },
  { o: 44, h: 62, l: 42, c: 58, up: true },
  { o: 58, h: 68, l: 50, c: 54, up: false },
  { o: 54, h: 72, l: 52, c: 68, up: true },
  { o: 68, h: 78, l: 58, c: 62, up: false },
  { o: 62, h: 76, l: 54, c: 72, up: true },
  { o: 72, h: 82, l: 62, c: 66, up: false },
  { o: 66, h: 74, l: 52, c: 56, up: false },
  { o: 56, h: 70, l: 48, c: 64, up: true },
  { o: 64, h: 74, l: 56, c: 58, up: false },
  { o: 58, h: 68, l: 50, c: 62, up: true },
]

const asks = [
  { price: '3.292', amount: '14.2K', total: '46.7K', depth: 78 },
  { price: '3.291', amount: '9.05K', total: '29.8K', depth: 52 },
  { price: '3.290', amount: '21.4K', total: '70.4K', depth: 90 },
  { price: '3.289', amount: '6.12K', total: '20.1K', depth: 38 },
  { price: '3.288', amount: '11.0K', total: '36.2K', depth: 61 },
  { price: '3.287', amount: '4.88K', total: '16.0K', depth: 29 },
]

const bids = [
  { price: '3.283', amount: '18.6K', total: '61.1K', depth: 72 },
  { price: '3.282', amount: '7.33K', total: '24.1K', depth: 44 },
  { price: '3.281', amount: '13.9K', total: '45.6K', depth: 58 },
  { price: '3.280', amount: '25.1K', total: '82.3K', depth: 95 },
  { price: '3.279', amount: '5.04K', total: '16.5K', depth: 33 },
  { price: '3.278', amount: '9.77K', total: '32.0K', depth: 49 },
]

const lastTrades = [
  { price: '3.284', amount: '420', side: 'buy' as const, time: '14:32:01' },
  { price: '3.283', amount: '1.02K', side: 'sell' as const, time: '14:32:01' },
  { price: '3.284', amount: '356', side: 'buy' as const, time: '14:31:58' },
  { price: '3.282', amount: '8.41K', side: 'sell' as const, time: '14:31:57' },
  { price: '3.285', amount: '612', side: 'buy' as const, time: '14:31:55' },
]

const {
  items: currentOrderItems,
  total: currentOrdersTotal,
  loading: currentOrdersLoading,
  loadingMore: currentOrdersLoadingMore,
  error: currentOrdersError,
  hasMore: currentOrdersHasMore,
  loadFirst: loadCurrentOrders,
  loadMore: loadMoreCurrentOrders,
} = useOrderListPagination(
  () => selectedPair.value,
  () => CURRENT_ORDER_STATUS_LIST,
)

const {
  items: historyOrderItems,
  total: historyOrdersTotal,
  loading: historyOrdersLoading,
  loadingMore: historyOrdersLoadingMore,
  error: historyOrdersError,
  hasMore: historyOrdersHasMore,
  loadFirst: loadHistoryOrders,
  loadMore: loadMoreHistoryOrders,
} = useOrderListPagination(
  () => selectedPair.value,
  () => HISTORY_ORDER_STATUS_LIST,
)

function loadOrdersForTab(tab: string) {
  if (tab === 'open')
    void loadCurrentOrders()
  else if (tab === 'history')
    void loadHistoryOrders()
}

onMounted(() => {
  syncOrderPrices()
  void loadCurrentOrders()
  void loadUserAssets()
})

async function refreshAfterOrder() {
  await loadUserAssets()
}

watch(selectedPair, () => {
  syncOrderPrices()
  clearOrderFeedback()
  loadOrdersForTab(ordersTab.value)
})

watch(orderTypeTab, () => {
  clearOrderFeedback()
})

watch(ordersTab, (tab) => {
  loadOrdersForTab(tab)
})

function candleBodyHeight(c: (typeof candles)[number]) {
  return Math.max(0.8, Math.abs(c.c - c.o))
}

function candleBodyTop(c: (typeof candles)[number]) {
  return 100 - Math.max(c.o, c.c)
}

function selectPair(sym: string) {
  selectedPair.value = sym
}

function syncOrderPrices() {
  buyPrice.value = lastPrice
  sellPrice.value = lastPrice
}

async function onLimitBuy() {
  const ok = await submitLimitOrder({
    symbolDisplay: selectedPair.value,
    side: ORDER_SIDE.BUY,
    price: buyPrice.value,
    baseAmount: buyAmount.value,
  })
  if (ok) {
    buyAmount.value = ''
    if (ordersTab.value === 'open')
      void loadCurrentOrders()
    void refreshAfterOrder()
  }
}

async function onLimitSell() {
  const ok = await submitLimitOrder({
    symbolDisplay: selectedPair.value,
    side: ORDER_SIDE.SELL,
    price: sellPrice.value,
    baseAmount: sellAmount.value,
  })
  if (ok) {
    sellAmount.value = ''
    if (ordersTab.value === 'open')
      void loadCurrentOrders()
    void refreshAfterOrder()
  }
}

async function onMarketBuy() {
  const ok = await submitMarketOrder({
    symbolDisplay: selectedPair.value,
    side: ORDER_SIDE.BUY,
    baseAmount: marketBuyAmount.value,
  })
  if (ok) {
    marketBuyAmount.value = ''
    if (ordersTab.value === 'open')
      void loadCurrentOrders()
    void refreshAfterOrder()
  }
}

async function onMarketSell() {
  const ok = await submitMarketOrder({
    symbolDisplay: selectedPair.value,
    side: ORDER_SIDE.SELL,
    baseAmount: marketSellAmount.value,
  })
  if (ok) {
    marketSellAmount.value = ''
    if (ordersTab.value === 'open')
      void loadCurrentOrders()
    void refreshAfterOrder()
  }
}
</script>

<template>
  <div
    class="terminal-okx dark bg-background text-foreground flex flex-col text-[13px] leading-snug antialiased"
  >
    <!-- 第一屏：行情 + K 线 + 下单 + 盘口（占满视口高度） -->
    <div class="flex min-h-svh w-full shrink-0">
      <!-- 左侧：行情列表 -->
      <aside
        class="border-border bg-background flex w-[268px] shrink-0 flex-col border-r"
      >
        <div class="flex h-full min-h-0 flex-col gap-2 px-2 pt-2 pb-1">
          <p class="text-foreground shrink-0 text-[11px] font-medium">
            行情
          </p>
          <div class="flex min-h-0 flex-1 flex-col gap-2">
            <div class="relative shrink-0">
              <Search
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              />
              <Input
                placeholder="搜索币种"
                class="border-border focus-visible:ring-[#474d57] h-8 border bg-[#141414] pr-2 pl-9 text-xs"
              />
            </div>
            <div
              class="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <Button
                v-for="c in categories"
                :key="c"
                variant="ghost"
                size="sm"
                class="text-muted-foreground hover:text-foreground h-7 shrink-0 rounded px-2.5 text-[11px]"
              >
                {{ c }}
              </Button>
            </div>
            <ScrollArea class="min-h-0 flex-1">
              <Table>
                <TableHeader>
                  <TableRow class="border-border hover:bg-transparent">
                    <TableHead class="text-muted-foreground h-8 px-2 text-[11px] font-medium">
                      交易对
                    </TableHead>
                    <TableHead
                      class="text-muted-foreground h-8 px-2 text-right text-[11px] font-medium"
                    >
                      最新价
                    </TableHead>
                    <TableHead
                      class="text-muted-foreground h-8 px-2 text-right text-[11px] font-medium"
                    >
                      24h 涨跌
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="row in marketPairs"
                    :key="row.sym"
                    class="border-border hover:bg-accent/40 cursor-pointer border-0"
                    :class="
                      selectedPair === row.sym ? 'bg-accent/60' : ''
                    "
                    @click="selectPair(row.sym)"
                  >
                    <TableCell class="px-2 py-1.5 text-xs font-medium">
                      {{ row.sym }}
                    </TableCell>
                    <TableCell class="px-2 py-1.5 text-right text-xs tabular-nums">
                      {{ row.price }}
                    </TableCell>
                    <TableCell
                      class="px-2 py-1.5 text-right text-xs font-medium tabular-nums"
                      :style="{ color: row.up ? okxUp : okxDown }"
                    >
                      {{ row.chg }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <!-- 资产（原「异动」位置，常驻展示） -->
          <div class="border-border shrink-0 border-t pt-2 pb-1">
            <p class="text-foreground mb-2 text-[11px] font-medium">
              资产
            </p>
            <p v-if="assetsLoading" class="text-muted-foreground text-[11px]">
              加载中…
            </p>
            <p v-else-if="assetsError" class="text-[11px] text-[#f6465d]">
              {{ assetsError }}
            </p>
            <p
              v-else-if="assetList.length === 0"
              class="text-muted-foreground text-[11px]"
            >
              暂无资产
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="asset in assetList"
                :key="`${asset.coin_id}-${asset.coin_name}`"
                class="border-border rounded border bg-[#141414] px-2.5 py-2 text-[11px] tabular-nums"
              >
                <p class="text-foreground mb-1 font-medium">
                  {{ asset.coin_name }}
                </p>
                <p class="text-muted-foreground">
                  可用
                  <span class="text-foreground font-semibold">{{
                    formatAssetQty(asset.available_qty)
                  }}</span>
                </p>
                <p
                  v-if="hasFrozenQty(asset.frozen_qty)"
                  class="text-muted-foreground mt-0.5"
                >
                  冻结
                  <span class="text-foreground font-semibold">{{
                    formatAssetQty(asset.frozen_qty)
                  }}</span>
                </p>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- 中间：行情头部 + K 线 + 下单 -->
      <main class="border-border bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-x">
        <!-- 标的统计条 -->
        <header
          class="border-border flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-3 py-2"
        >
          <Button
            variant="ghost"
            class="hover:bg-accent h-auto gap-1 px-1 py-0 text-base font-semibold"
          >
            {{ selectedPair }}
            <ChevronDown class="size-4 opacity-60" />
          </Button>
          <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span
              class="text-xl font-semibold tabular-nums"
              :style="{ color: okxUp }"
            >{{ lastPrice }}</span>
            <span
              class="text-sm font-medium tabular-nums"
              :style="{ color: okxUp }"
            >{{ changePct }}</span>
          </div>
          <div
            class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
          >
            <span v-for="s in statsRow" :key="s.label" class="tabular-nums whitespace-nowrap">
              {{ s.label }}
              <span class="text-foreground ml-1 font-medium">{{
                s.value
              }}</span>
            </span>
          </div>
        </header>

        <!-- K 线区域（占据第一屏剩余高度） -->
        <div class="flex min-h-0 flex-1 flex-col border-b">
          <div
            class="border-border flex flex-wrap items-center gap-1 border-b px-2 py-1"
          >
            <Button
              v-for="tf in timeframes"
              :key="tf"
              variant="ghost"
              size="sm"
              class="h-7 rounded px-2 text-[11px]"
              :class="
                tfActive === tf
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground'
              "
              @click="tfActive = tf"
            >
              {{ tf }}
            </Button>
            <span class="text-muted-foreground ml-auto text-[11px]">
              全屏
            </span>
          </div>
          <div class="flex min-h-0 flex-1">
            <!-- 左侧画图工具条 -->
            <div
              class="border-border bg-muted/20 flex w-9 shrink-0 flex-col items-center gap-3 border-r py-2"
            >
              <Crosshair class="text-muted-foreground size-4 opacity-80" />
              <Minus class="text-muted-foreground size-4 opacity-80" />
              <PenLine class="text-muted-foreground size-4 opacity-80" />
            </div>
            <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-black">
              <div class="relative min-h-[420px] flex-1">
                <svg
                  class="text-[#2b2b43] absolute inset-2 h-[calc(100%-1.25rem)] w-[calc(100%-1rem)]"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <g opacity="0.9">
                    <line
                      v-for="i in 5"
                      :key="`h-${i}`"
                      stroke="currentColor"
                      stroke-width="0.12"
                      x1="0"
                      :x2="100"
                      :y1="i * 20"
                      :y2="i * 20"
                    />
                    <line
                      v-for="i in 8"
                      :key="`v-${i}`"
                      stroke="currentColor"
                      stroke-width="0.12"
                      :x1="i * 12.5"
                      :x2="i * 12.5"
                      y1="0"
                      y2="100"
                    />
                  </g>
                  <line
                    :stroke="okxDown"
                    stroke-dasharray="1.5 2"
                    stroke-width="0.35"
                    x1="0"
                    x2="100"
                    y1="52"
                    y2="52"
                  />
                  <g>
                    <g
                      v-for="(c, i) in candles"
                      :key="i"
                      :transform="`translate(${6 + i * 7.2}, 0)`"
                    >
                      <line
                        :stroke="c.up ? okxUp : okxDown"
                        stroke-width="0.45"
                        x1="3"
                        x2="3"
                        :y1="100 - c.h"
                        :y2="100 - c.l"
                      />
                      <rect
                        :fill="c.up ? okxUp : okxDown"
                        :height="candleBodyHeight(c)"
                        rx="0.2"
                        width="5"
                        :y="candleBodyTop(c)"
                        x="0.5"
                      />
                    </g>
                  </g>
                </svg>
                <div
                  class="text-muted-foreground pointer-events-none absolute inset-x-3 bottom-1 flex justify-between text-[10px] tabular-nums"
                >
                  <span v-for="lab in chartLabels" :key="lab">{{ lab }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 交易面板 -->
        <section class="border-border shrink-0 border-b px-3 py-2">
          <p
            v-if="orderFeedback"
            class="mb-2 rounded-md px-2 py-1.5 text-[12px]"
            :class="orderFeedbackOk ? 'bg-[#00d395]/15 text-[#00d395]' : 'bg-[#f6465d]/15 text-[#f6465d]'"
          >
            {{ orderFeedback }}
          </p>
          <p
            v-if="assetsError && !orderFeedback"
            class="text-muted-foreground mb-2 text-[11px]"
          >
            资产：{{ assetsError }}
          </p>
          <Tabs v-model="orderTypeTab" default-value="limit" class="gap-2">
            <TabsList class="bg-muted/40 mb-3 inline-flex h-8 rounded-md p-0.5">
              <TabsTrigger value="limit" class="px-3 text-[11px]">
                限价
              </TabsTrigger>
              <TabsTrigger value="market" class="px-3 text-[11px]">
                市价
              </TabsTrigger>
              <TabsTrigger value="tpsl" class="px-3 text-[11px]">
                止盈止损
              </TabsTrigger>
            </TabsList>

            <TabsContent value="limit" class="mt-0">
              <div class="grid gap-4 lg:grid-cols-2">
                <!-- 买入 -->
                <div class="space-y-2">
                  <span class="text-[11px] font-medium" :style="{ color: okxUp }">买入</span>
                  <OrderAssetBar
                    :loading="quoteAsset.loading"
                    :avail="quoteAsset.avail"
                    :coin="quoteAsset.coin"
                    :frozen="quoteAsset.frozen"
                    :show-frozen="quoteAsset.showFrozen"
                  />
                  <div class="flex gap-2">
                    <div class="relative min-w-0 flex-1">
                      <Label class="text-muted-foreground sr-only" for="buy-price">价格</Label>
                      <Input
                        id="buy-price"
                        v-model="buyPrice"
                        placeholder="价格"
                        class="border-border focus-visible:ring-[#474d57] h-9 border bg-[#141414] text-xs tabular-nums"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      class="border-border text-muted-foreground h-9 shrink-0 px-2 text-[11px]"
                    >
                      BBO
                    </Button>
                  </div>
                  <div>
                    <Label class="text-muted-foreground mb-1 block text-[11px]" for="buy-amt">数量</Label>
                    <Input
                      id="buy-amt"
                      v-model="buyAmount"
                      placeholder="数量"
                      class="border-border focus-visible:ring-[#474d57] h-9 border bg-[#141414] text-xs tabular-nums"
                    />
                  </div>
                  <div class="space-y-1">
                    <Slider v-model="buySlider" :max="100" :step="25" class="w-full" />
                    <div class="text-muted-foreground flex justify-between text-[10px] tabular-nums">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div class="text-muted-foreground flex justify-between text-[11px]">
                    <span>成交额</span>
                    <span class="text-foreground tabular-nums">0.00 {{ quoteCurrency }}</span>
                  </div>
                  <Button
                    class="h-10 w-full rounded-md text-sm font-semibold text-black"
                    :style="{ backgroundColor: okxUp }"
                    :disabled="orderSubmitting"
                    @click="onLimitBuy"
                  >
                    {{ orderSubmitting ? '提交中…' : `买入 ${baseCurrency}` }}
                  </Button>
                  <p class="text-muted-foreground text-[11px] tabular-nums">
                    最大可买 ≈ {{ maxBuyBaseDisplay }} {{ baseCurrency }}
                  </p>
                </div>

                <!-- 卖出 -->
                <div class="space-y-2">
                  <span class="text-[11px] font-medium" :style="{ color: okxDown }">卖出</span>
                  <OrderAssetBar
                    :loading="baseAsset.loading"
                    :avail="baseAsset.avail"
                    :coin="baseAsset.coin"
                    :frozen="baseAsset.frozen"
                    :show-frozen="baseAsset.showFrozen"
                  />
                  <div class="flex gap-2">
                    <div class="relative min-w-0 flex-1">
                      <Label class="text-muted-foreground sr-only" for="sell-price">价格</Label>
                      <Input
                        id="sell-price"
                        v-model="sellPrice"
                        placeholder="价格"
                        class="border-border focus-visible:ring-[#474d57] h-9 border bg-[#141414] text-xs tabular-nums"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      class="border-border text-muted-foreground h-9 shrink-0 px-2 text-[11px]"
                    >
                      BBO
                    </Button>
                  </div>
                  <div>
                    <Label class="text-muted-foreground mb-1 block text-[11px]" for="sell-amt">数量</Label>
                    <Input
                      id="sell-amt"
                      v-model="sellAmount"
                      placeholder="数量"
                      class="border-border focus-visible:ring-[#474d57] h-9 border bg-[#141414] text-xs tabular-nums"
                    />
                  </div>
                  <div class="space-y-1">
                    <Slider v-model="sellSlider" :max="100" :step="25" class="w-full" />
                    <div class="text-muted-foreground flex justify-between text-[10px] tabular-nums">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div class="text-muted-foreground flex justify-between text-[11px]">
                    <span>成交额</span>
                    <span class="text-foreground tabular-nums">0.00 {{ quoteCurrency }}</span>
                  </div>
                  <Button
                    class="h-10 w-full rounded-md text-sm font-semibold text-white"
                    :style="{ backgroundColor: okxDown }"
                    :disabled="orderSubmitting"
                    @click="onLimitSell"
                  >
                    {{ orderSubmitting ? '提交中…' : `卖出 ${baseCurrency}` }}
                  </Button>
                  <p class="text-muted-foreground text-[11px] tabular-nums">
                    最大可卖 ≈ {{ maxSellDisplay }} {{ baseCurrency }}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="market" class="mt-0">
              <div class="text-muted-foreground grid gap-4 text-[12px] lg:grid-cols-2">
                <div class="space-y-2">
                  <p class="font-medium" :style="{ color: okxUp }">
                    市价买入
                  </p>
                  <p>按对手盘最优卖价成交，仅需填写数量。</p>
                  <OrderAssetBar
                    :loading="quoteAsset.loading"
                    :avail="quoteAsset.avail"
                    :coin="quoteAsset.coin"
                    :frozen="quoteAsset.frozen"
                    :show-frozen="quoteAsset.showFrozen"
                  />
                  <Input
                    v-model="marketBuyAmount"
                    :placeholder="`数量 (${baseCurrency})`"
                    class="border-border h-9 border bg-[#141414] text-xs tabular-nums"
                  />
                  <Button
                    class="h-10 w-full text-black"
                    :style="{ backgroundColor: okxUp }"
                    :disabled="orderSubmitting"
                    @click="onMarketBuy"
                  >
                    {{ orderSubmitting ? '提交中…' : '市价买入' }}
                  </Button>
                </div>
                <div class="space-y-2">
                  <p class="font-medium" :style="{ color: okxDown }">
                    市价卖出
                  </p>
                  <p>按对手盘最优买价成交，仅需填写数量。</p>
                  <OrderAssetBar
                    :loading="baseAsset.loading"
                    :avail="baseAsset.avail"
                    :coin="baseAsset.coin"
                    :frozen="baseAsset.frozen"
                    :show-frozen="baseAsset.showFrozen"
                  />
                  <Input
                    v-model="marketSellAmount"
                    :placeholder="`数量 (${baseCurrency})`"
                    class="border-border h-9 border bg-[#141414] text-xs tabular-nums"
                  />
                  <Button
                    class="h-10 w-full text-white"
                    :style="{ backgroundColor: okxDown }"
                    :disabled="orderSubmitting"
                    @click="onMarketSell"
                  >
                    {{ orderSubmitting ? '提交中…' : '市价卖出' }}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tpsl" class="mt-0">
              <p class="text-muted-foreground text-[12px] leading-relaxed">
                止盈止损委托示意：可扩展触发价、委托价与数量联动校验（TP/SL）。
              </p>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <!-- 右侧：订单簿 / 成交 -->
      <aside class="border-border bg-background flex w-[292px] shrink-0 flex-col border-l">
        <Tabs default-value="book" class="flex min-h-0 flex-1 flex-col px-0 pt-2">
          <TabsList class="bg-muted/50 mx-2 mb-2 grid h-8 shrink-0 grid-cols-2 rounded-md p-0.5">
            <TabsTrigger value="book" class="text-[11px]">
              订单簿
            </TabsTrigger>
            <TabsTrigger value="trades" class="text-[11px]">
              最新成交
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="book"
            class="mt-0 flex min-h-0 flex-1 flex-col px-0 data-[state=inactive]:hidden"
          >
            <div
              class="text-muted-foreground grid grid-cols-[1fr_1fr_1fr] gap-2 border-b px-3 py-2 text-[11px] font-medium"
            >
              <span>价格 (USDT)</span>
              <span class="text-right">
                数量 (TON)
              </span>
              <span class="text-right">
                累计 (TON)
              </span>
            </div>
            <ScrollArea class="min-h-0 flex-1">
              <div class="space-y-px pb-2">
                <div
                  v-for="(row, idx) in asks"
                  :key="`ask-${idx}`"
                  class="relative grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-0.5 text-[11px] leading-tight tabular-nums"
                >
                  <div
                    class="absolute inset-y-0 right-0"
                    :style="{
                      width: `${row.depth}%`,
                      backgroundColor: `${okxDown}22`,
                    }"
                  />
                  <span class="relative font-medium" :style="{ color: okxDown }">{{ row.price }}</span>
                  <span class="text-muted-foreground relative text-right">{{ row.amount }}</span>
                  <span class="text-muted-foreground relative text-right">{{ row.total }}</span>
                </div>
              </div>
              <Separator class="bg-[#2b2b43]" />
              <div
                class="flex flex-col items-center gap-0.5 py-2"
              >
                <span class="text-lg font-semibold tabular-nums" :style="{ color: okxUp }">{{ lastPrice }}</span>
                <span class="text-muted-foreground text-[10px] tabular-nums">指数 {{ statsRow[1]?.value }}</span>
              </div>
              <Separator class="bg-[#2b2b43]" />
              <div class="space-y-px pt-px pb-4">
                <div
                  v-for="(row, idx) in bids"
                  :key="`bid-${idx}`"
                  class="relative grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-0.5 text-[11px] leading-tight tabular-nums"
                >
                  <div
                    class="absolute inset-y-0 right-0"
                    :style="{
                      width: `${row.depth}%`,
                      backgroundColor: `${okxUp}22`,
                    }"
                  />
                  <span class="relative font-medium" :style="{ color: okxUp }">{{ row.price }}</span>
                  <span class="text-muted-foreground relative text-right">{{ row.amount }}</span>
                  <span class="text-muted-foreground relative text-right">{{ row.total }}</span>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent
            value="trades"
            class="mt-0 flex min-h-0 flex-1 flex-col px-0 data-[state=inactive]:hidden"
          >
            <div
              class="text-muted-foreground grid grid-cols-[1fr_1fr_auto] gap-2 border-b px-3 py-2 text-[11px] font-medium"
            >
              <span>价格</span>
              <span class="text-right">
                数量
              </span>
              <span class="text-right">
                时间
              </span>
            </div>
            <ScrollArea class="min-h-0 flex-1">
              <div
                v-for="(t, i) in lastTrades"
                :key="i"
                class="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-0.5 text-[11px] tabular-nums"
              >
                <span
                  class="font-medium"
                  :style="{ color: t.side === 'buy' ? okxUp : okxDown }"
                >{{ t.price }}</span>
                <span class="text-muted-foreground text-right">{{ t.amount }}</span>
                <span class="text-muted-foreground text-right">{{ t.time }}</span>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </aside>
    </div>

    <!-- 第二屏：委托列表（向下滚动可见） -->
    <Card
      id="orders-panel"
      class="border-border min-h-[50vh] shrink-0 gap-0 rounded-none border-0 border-t bg-black py-0 shadow-none"
    >
      <CardHeader class="space-y-2 px-3 py-2">
        <Tabs v-model="ordersTab" default-value="open" class="gap-2">
          <TabsList class="bg-muted/40 inline-flex h-8 rounded-md p-0.5">
            <TabsTrigger value="open" class="text-[11px]">
              当前委托
            </TabsTrigger>
            <TabsTrigger value="history" class="text-[11px]">
              历史委托
            </TabsTrigger>
          </TabsList>
          <TabsContent value="open" class="mt-0">
            <p
              v-if="currentOrdersError"
              class="text-destructive mb-2 text-[11px]"
            >
              {{ currentOrdersError }}
            </p>
            <p
              v-if="currentOrdersLoading && currentOrderItems.length === 0"
              class="text-muted-foreground mb-2 text-[11px]"
            >
              加载中…
            </p>
            <p
              v-else-if="!currentOrdersError && currentOrderItems.length === 0"
              class="text-muted-foreground mb-2 text-[11px]"
            >
              暂无当前委托
            </p>
            <div
              v-else-if="!currentOrdersError"
              class="border-border overflow-x-auto rounded-sm border"
            >
              <Table>
                <TableHeader>
                  <TableRow :class="orderHeadRowClass">
                    <TableHead class="whitespace-nowrap">
                      时间
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      交易对
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      方向
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托价
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托量
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托总额
                    </TableHead>
                    <TableHead class="min-w-[130px] whitespace-nowrap">
                      成交 / 剩余
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      状态
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="o in currentOrderItems"
                    :key="o.id"
                    :class="orderBodyRowClass"
                  >
                    <TableCell class="text-muted-foreground whitespace-nowrap text-[11px]">
                      {{ o.time }}
                    </TableCell>
                    <TableCell class="text-[11px] font-medium">
                      {{ o.symbol }}
                    </TableCell>
                    <TableCell
                      class="text-[11px] font-medium"
                      :style="{ color: o.sideIsBuy ? okxUp : okxDown }"
                    >
                      {{ o.side }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.price }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.qty }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.total }}
                    </TableCell>
                    <TableCell class="text-muted-foreground text-[11px] tabular-nums">
                      {{ o.filled }}
                    </TableCell>
                    <TableCell class="text-[11px]">
                      {{ o.status }}
                    </TableCell>
                    <TableCell class="whitespace-nowrap">
                      <span class="inline-flex h-7 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          class="border-[#f7931a]/50 bg-[#f7931a]/15 text-[#f7931a] hover:bg-[#f7931a]/25 h-7 px-2 text-[11px] leading-none"
                        >
                          撤单
                        </Button>
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div
              v-if="currentOrderItems.length > 0 && !currentOrdersError"
              class="flex flex-col items-center gap-1 py-2"
            >
              <Button
                v-if="currentOrdersHasMore"
                variant="ghost"
                size="sm"
                class="text-muted-foreground hover:text-foreground h-7 text-[11px]"
                :disabled="currentOrdersLoadingMore"
                @click="loadMoreCurrentOrders()"
              >
                {{ currentOrdersLoadingMore ? '加载中…' : '加载更多' }}
              </Button>
              <p
                v-else
                class="text-muted-foreground text-[11px]"
              >
                已加载全部 {{ currentOrdersTotal }} 条
              </p>
            </div>
          </TabsContent>
          <TabsContent value="history" class="mt-0">
            <p
              v-if="historyOrdersError"
              class="text-destructive mb-2 text-[11px]"
            >
              {{ historyOrdersError }}
            </p>
            <p
              v-if="historyOrdersLoading && historyOrderItems.length === 0"
              class="text-muted-foreground mb-2 text-[11px]"
            >
              加载中…
            </p>
            <p
              v-else-if="!historyOrdersError && historyOrderItems.length === 0"
              class="text-muted-foreground mb-2 text-[11px]"
            >
              暂无历史委托
            </p>
            <div
              v-else-if="!historyOrdersError"
              class="border-border overflow-x-auto rounded-sm border"
            >
              <Table>
                <TableHeader>
                  <TableRow :class="orderHeadRowClass">
                    <TableHead class="whitespace-nowrap">
                      时间
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      交易对
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      方向
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托价
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托量
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      委托总额
                    </TableHead>
                    <TableHead class="min-w-[130px] whitespace-nowrap">
                      成交 / 剩余
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      状态
                    </TableHead>
                    <TableHead class="whitespace-nowrap">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="o in historyOrderItems"
                    :key="o.id"
                    :class="orderBodyRowClass"
                  >
                    <TableCell class="text-muted-foreground whitespace-nowrap text-[11px]">
                      {{ o.time }}
                    </TableCell>
                    <TableCell class="text-[11px] font-medium">
                      {{ o.symbol }}
                    </TableCell>
                    <TableCell
                      class="text-[11px] font-medium"
                      :style="{ color: o.sideIsBuy ? okxUp : okxDown }"
                    >
                      {{ o.side }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.price }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.qty }}
                    </TableCell>
                    <TableCell class="text-[11px] tabular-nums">
                      {{ o.total }}
                    </TableCell>
                    <TableCell class="text-muted-foreground text-[11px] tabular-nums">
                      {{ o.filled }}
                    </TableCell>
                    <TableCell class="text-[11px]">
                      {{ o.status }}
                    </TableCell>
                    <TableCell class="text-muted-foreground whitespace-nowrap text-[11px]">
                      <span class="inline-flex h-7 items-center">—</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div
              v-if="historyOrderItems.length > 0 && !historyOrdersError"
              class="flex flex-col items-center gap-1 py-2"
            >
              <Button
                v-if="historyOrdersHasMore"
                variant="ghost"
                size="sm"
                class="text-muted-foreground hover:text-foreground h-7 text-[11px]"
                :disabled="historyOrdersLoadingMore"
                @click="loadMoreHistoryOrders()"
              >
                {{ historyOrdersLoadingMore ? '加载中…' : '加载更多' }}
              </Button>
              <p
                v-else
                class="text-muted-foreground text-[11px]"
              >
                已加载全部 {{ historyOrdersTotal }} 条
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  </div>
</template>
