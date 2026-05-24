<script setup lang="ts">
import { ref } from 'vue'
import { ApiError, login, setAuthSession } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const emit = defineEmits<{
  success: []
}>()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) {
    error.value = '请输入账号和密码'
    return
  }

  loading.value = true
  try {
    const data = await login({ username: u, password: p })
    setAuthSession(data)
    emit('success')
  }
  catch (e) {
    error.value = e instanceof ApiError ? e.message : '登录失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="text-foreground flex min-h-svh items-center justify-center p-4">
    <Card class="border-border w-full max-w-sm border bg-[#141414] shadow-none">
      <CardHeader class="space-y-1 pb-4">
        <CardTitle class="text-center text-lg font-semibold tracking-tight">
          GEX 登录
        </CardTitle>
        <p class="text-muted-foreground text-center text-[12px]">
          登录后进入交易终端
        </p>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="username">账号</Label>
            <Input
              id="username"
              v-model="username"
              autocomplete="username"
              placeholder="请输入用户名"
              class="border-border focus-visible:ring-[#474d57] h-10 border bg-[#0b0e11]"
            />
          </div>
          <div class="space-y-2">
            <Label for="password">密码</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入密码"
              class="border-border focus-visible:ring-[#474d57] h-10 border bg-[#0b0e11]"
            />
          </div>

          <p
            v-if="error"
            class="text-destructive text-center text-[12px]"
          >
            {{ error }}
          </p>

          <Button
            type="submit"
            class="h-10 w-full bg-[#00d395] text-black hover:bg-[#00d395]/90"
            :disabled="loading"
          >
            {{ loading ? '登录中…' : '登录' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
