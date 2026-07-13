<template>
  <div class="admin-login">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🎨</div>
        <h1 class="login-title">婚贝模板制作后台</h1>
        <p class="login-subtitle">请使用管理员账号登录</p>
      </div>

      <div class="form-group">
        <label class="form-label">管理员手机号</label>
        <input
          v-model="phone"
          type="tel"
          maxlength="11"
          class="form-input"
          placeholder="请输入管理员手机号"
          :disabled="loading"
          @keyup.enter="onLogin"
        />
      </div>

      <div class="form-group">
        <label class="form-label">验证码</label>
        <div class="code-row">
          <input
            v-model="code"
            type="text"
            maxlength="6"
            class="form-input code-input"
            placeholder="请输入 6 位验证码"
            :disabled="loading"
            @keyup.enter="onLogin"
          />
          <button
            class="send-btn"
            :disabled="countdown > 0 || sendingCode || loading"
            @click="onSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : (sendingCode ? '发送中…' : '获取验证码') }}
          </button>
        </div>
      </div>

      <button
        class="login-btn"
        :disabled="loading || !canSubmit"
        @click="onLogin"
      >
        {{ loading ? '登录中…' : '🔐 登录' }}
      </button>

      <div v-if="devHint" class="dev-hint">
        <span>💡 开发环境提示：</span>
        <span>{{ devHint }}</span>
      </div>

      <div v-if="errorMsg" class="error-msg">❌ {{ errorMsg }}</div>

      <div class="login-footer">
        仅限管理员使用 · 令牌有效期 7 天
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { sendSmsCode, adminLogin } from '../composables/useApi'

const emit = defineEmits<{
  (e: 'success', token: string): void
}>()

const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || ''
const DEV_CODE = import.meta.env.VITE_DEV_CODE || ''
const isDev = import.meta.env.MODE !== 'production'

const phone = ref<string>(ADMIN_PHONE)
const code = ref<string>('')
const loading = ref(false)
const sendingCode = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 开发环境提示：管理员手机号 + 万能验证码
const devHint = computed(() => {
  if (!isDev) return ''
  const parts: string[] = []
  if (ADMIN_PHONE) parts.push(`管理员手机号 ${ADMIN_PHONE}`)
  if (DEV_CODE) parts.push(`万能验证码 ${DEV_CODE}`)
  return parts.join('，')
})

const canSubmit = computed(() => {
  return /^1\d{10}$/.test(phone.value) && /^\d{4,6}$/.test(code.value)
})

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function onSendCode() {
  errorMsg.value = ''
  if (!/^1\d{10}$/.test(phone.value)) {
    errorMsg.value = '请输入正确的手机号'
    return
  }
  sendingCode.value = true
  try {
    const res = await sendSmsCode(phone.value)
    if (!res.success) {
      errorMsg.value = res.error || '验证码发送失败'
      return
    }
    startCountdown()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error || e?.message || '验证码发送失败'
  } finally {
    sendingCode.value = false
  }
}

async function onLogin() {
  errorMsg.value = ''
  if (!canSubmit.value) {
    errorMsg.value = '请填写完整的手机号和验证码'
    return
  }
  loading.value = true
  try {
    const res = await adminLogin(phone.value, code.value)
    if (!res.success || !res.token) {
      errorMsg.value = res.error || '登录失败'
      return
    }
    emit('success', res.token)
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error || e?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.admin-login {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.login-card {
  width: 380px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 16px;
  padding: 40px 32px 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 8px;
}

.login-title {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 6px;
}

.login-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.form-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.code-row {
  display: flex;
  gap: 8px;
}

.code-input {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
  height: 42px;
  padding: 0 14px;
  border: 1px solid #667eea;
  background: #fff;
  color: #667eea;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: #667eea;
  color: #fff;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-btn {
  width: 100%;
  height: 46px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.05s;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.login-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dev-hint {
  margin-top: 16px;
  padding: 10px 12px;
  background: #fef9e7;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.error-msg {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 13px;
  color: #b91c1c;
  line-height: 1.5;
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}
</style>
