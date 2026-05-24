<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  buildChartLayout,
  CHART_VISIBLE_DEFAULT,
  CHART_VISIBLE_MAX,
  CHART_VISIBLE_MIN,
  type ChartCandleView,
  type KlineItem,
} from '@/api/quotes'

const props = defineProps<{
  items: KlineItem[]
  loading?: boolean
  error?: string
  upColor?: string
  downColor?: string
}>()

const upColor = computed(() => props.upColor ?? '#00d395')
const downColor = computed(() => props.downColor ?? '#f6465d')

const chartRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const visibleCount = ref(CHART_VISIBLE_DEFAULT)
const viewStart = ref(0)
const dragging = ref(false)
const dragLastX = ref(0)
const hoverIndex = ref<number | null>(null)

const maxStart = computed(() =>
  Math.max(0, props.items.length - visibleCount.value),
)

const layout = computed(() =>
  buildChartLayout(props.items, viewStart.value, visibleCount.value),
)

const activeItem = computed(() => {
  const slice = layout.value.candles.length
  if (slice === 0)
    return null
  const local =
    hoverIndex.value !== null
      ? hoverIndex.value
      : slice - 1
  const global = layout.value.startIndex + local
  return props.items[global] ?? null
})

const activeUp = computed(() => {
  if (!activeItem.value)
    return true
  return Number(activeItem.value.close) >= Number(activeItem.value.open)
})

function formatPrice(value: string) {
  const n = Number(value)
  if (Number.isNaN(n))
    return value || '—'
  if (n >= 1000)
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1)
    return n.toFixed(4).replace(/\.?0+$/, '')
  return n.toPrecision(4)
}

function formatKlineTime(ts: number) {
  const sec = ts > 1e12 ? Math.floor(ts / 1000) : ts
  const d = new Date(sec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function updateHoverIndex(e: PointerEvent) {
  const el = svgRef.value
  if (!el || layout.value.candles.length === 0)
    return
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0)
    return
  const ratio = (e.clientX - rect.left) / rect.width
  const i = Math.floor(ratio * layout.value.candles.length)
  hoverIndex.value = Math.max(
    0,
    Math.min(layout.value.candles.length - 1, i),
  )
}

watch(
  () => props.items.length,
  (len, prev) => {
    if (len === 0) {
      viewStart.value = 0
      return
    }
    if (prev === undefined || viewStart.value >= maxStart.value) {
      viewStart.value = maxStart.value
    }
    else {
      viewStart.value = Math.min(viewStart.value, maxStart.value)
    }
  },
  { immediate: true },
)

function candleBodyHeight(c: ChartCandleView) {
  return Math.max(0.35, Math.abs(c.c - c.o))
}

function candleBodyTop(c: ChartCandleView) {
  return 100 - Math.max(c.o, c.c)
}

function onPointerDown(e: PointerEvent) {
  if (props.items.length === 0)
    return
  dragging.value = true
  dragLastX.value = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!chartRef.value)
    return
  if (dragging.value) {
    const dx = e.clientX - dragLastX.value
    dragLastX.value = e.clientX
    const barWidth = chartRef.value.clientWidth / visibleCount.value
    if (barWidth <= 0)
      return
    const delta = Math.round(-dx / barWidth)
    if (delta !== 0) {
      viewStart.value = Math.min(
        maxStart.value,
        Math.max(0, viewStart.value + delta),
      )
    }
    return
  }
  updateHoverIndex(e)
}

function onPointerLeave() {
  hoverIndex.value = null
}

function onPointerUp(e: PointerEvent) {
  dragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }
  catch {
    /* ignore */
  }
}

function onWheel(e: WheelEvent) {
  if (props.items.length === 0)
    return
  e.preventDefault()
  const step = e.deltaY > 0 ? 6 : -6
  const next = Math.min(
    CHART_VISIBLE_MAX,
    Math.max(CHART_VISIBLE_MIN, visibleCount.value + step),
  )
  if (next === visibleCount.value)
    return
  const ratio = viewStart.value / Math.max(1, maxStart.value)
  visibleCount.value = next
  viewStart.value = Math.round(ratio * maxStart.value)
}

function scrollToLatest() {
  viewStart.value = maxStart.value
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <p
      v-if="error"
      class="text-destructive absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-[12px]"
    >
      {{ error }}
    </p>
    <p
      v-else-if="loading && items.length === 0"
      class="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center text-[12px]"
    >
      K线加载中…
    </p>
    <template v-else-if="layout.candles.length > 0">
      <div
        ref="chartRef"
        class="relative min-h-0 flex-1 touch-none select-none"
        :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerLeave"
        @wheel.prevent="onWheel"
      >
        <div
          v-if="activeItem"
          class="pointer-events-none absolute top-1 left-2 z-10 flex max-w-[calc(100%-3.5rem)] flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums"
        >
          <span class="text-muted-foreground">
            {{ formatKlineTime(activeItem.start_time) }}
          </span>
          <span class="text-muted-foreground">
            开
            <span class="text-foreground ml-0.5">{{ formatPrice(activeItem.open) }}</span>
          </span>
          <span class="text-muted-foreground">
            高
            <span class="ml-0.5" :style="{ color: upColor }">{{ formatPrice(activeItem.high) }}</span>
          </span>
          <span class="text-muted-foreground">
            低
            <span class="ml-0.5" :style="{ color: downColor }">{{ formatPrice(activeItem.low) }}</span>
          </span>
          <span class="text-muted-foreground">
            收
            <span
              class="ml-0.5 font-medium"
              :style="{ color: activeUp ? upColor : downColor }"
            >{{ formatPrice(activeItem.close) }}</span>
          </span>
        </div>

        <svg
          ref="svgRef"
          class="text-[#2b2b43] absolute inset-y-2 left-1 right-12 h-[calc(100%-1.5rem)] w-[calc(100%-3rem)]"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <g opacity="0.9">
            <line
              v-for="i in 5"
              :key="`h-${i}`"
              stroke="currentColor"
              stroke-width="0.1"
              x1="0"
              x2="100"
              :y1="i * 25"
              :y2="i * 25"
            />
            <line
              v-for="i in 6"
              :key="`v-${i}`"
              stroke="currentColor"
              stroke-width="0.08"
              :x1="i * 20"
              :x2="i * 20"
              y1="0"
              y2="100"
            />
          </g>
          <g>
            <g v-for="(c, i) in layout.candles" :key="`${layout.startIndex}-${i}`">
              <line
                :stroke="c.up ? upColor : downColor"
                stroke-width="0.35"
                :x1="c.x"
                :x2="c.x"
                :y1="100 - c.h"
                :y2="100 - c.l"
              />
              <rect
                :fill="c.up ? upColor : downColor"
                :height="candleBodyHeight(c)"
                rx="0.15"
                :width="c.w"
                :x="c.x - c.w / 2"
                :y="candleBodyTop(c)"
              />
            </g>
          </g>
        </svg>

        <div
          class="text-muted-foreground pointer-events-none absolute inset-y-2 right-1 flex w-11 flex-col justify-between text-[10px] tabular-nums"
        >
          <span
            v-for="(tick, i) in layout.priceTicks"
            :key="`p-${i}`"
            class="leading-none"
          >
            {{ tick.label }}
          </span>
        </div>

        <div
          class="text-muted-foreground pointer-events-none absolute inset-x-2 bottom-0 flex justify-between text-[10px] tabular-nums"
        >
          <span v-for="(lab, idx) in layout.labels" :key="`${lab}-${idx}`">{{ lab }}</span>
        </div>
      </div>

      <div
        class="text-muted-foreground border-border flex shrink-0 items-center justify-between border-t px-2 py-1 text-[10px]"
      >
        <span class="tabular-nums">
          {{ layout.candles.length }} / {{ layout.total }} 根
        </span>
        <span>拖动平移 · 滚轮缩放</span>
        <button
          type="button"
          class="text-foreground hover:text-[#00d395]"
          @click="scrollToLatest"
        >
          回到最新
        </button>
      </div>
    </template>
    <p
      v-else-if="!loading"
      class="text-muted-foreground absolute inset-0 flex items-center justify-center text-[12px]"
    >
      暂无 K 线数据
    </p>
  </div>
</template>
