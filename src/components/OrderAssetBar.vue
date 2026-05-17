<script setup lang="ts">
defineProps<{
  loading: boolean
  avail: string
  coin: string
  frozen: string
  showFrozen: boolean
}>()
</script>

<template>
  <div
    class="border-border w-full min-w-0 rounded border bg-[#141414] px-2.5 py-2 text-[12px] leading-snug"
  >
    <p v-if="loading" class="text-muted-foreground">
      资产加载中…
    </p>
    <p v-else class="text-foreground flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 tabular-nums">
      <span class="text-muted-foreground">可用</span>
      <span class="font-semibold">{{ avail }}</span>
      <span class="font-medium">{{ coin }}</span>
      <template v-if="showFrozen">
        <span class="text-muted-foreground mx-0.5">·</span>
        <span class="text-muted-foreground">冻结</span>
        <span class="font-semibold">{{ frozen }}</span>
      </template>
    </p>
  </div>
</template>
