<script setup lang="ts">
import { ref } from 'vue'
import { isAuthenticated } from '@/api'
import { onAuthExpired } from '@/api/request'
import LoginPage from './components/LoginPage.vue'
import TradingTerminal from './components/TradingTerminal.vue'

const authed = ref(isAuthenticated())

function onLoginSuccess() {
  authed.value = true
}

onAuthExpired(() => {
  authed.value = false
})
</script>

<template>
  <div class="dark terminal-okx bg-background min-h-svh">
    <LoginPage v-if="!authed" @success="onLoginSuccess" />
    <TradingTerminal v-else />
  </div>
</template>
