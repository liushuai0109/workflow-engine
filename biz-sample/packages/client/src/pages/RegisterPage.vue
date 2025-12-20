<template>
  <div class="register-page">
    <t-card :bordered="false" class="page-card">
      <template #header>
        <div class="card-header">
          <t-icon name="user" size="24px" />
          <h2>用户注册</h2>
        </div>
      </template>
      
      <t-form :data="form" @submit="handleSubmit" label-width="80px">
        <t-form-item label="手机号" name="phone" :rules="phoneRules">
          <t-input
            v-model="form.phone"
            type="tel"
            placeholder="请输入手机号"
            clearable
            :maxlength="11"
          />
        </t-form-item>

        <t-form-item label="密码" name="password" :rules="passwordRules">
          <t-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            clearable
          />
        </t-form-item>

        <t-form-item label="验证码" name="verifyCode">
          <t-input
            v-model="form.verifyCode"
            placeholder="请输入验证码（可选）"
            clearable
          />
        </t-form-item>

        <t-form-item>
          <t-button
            theme="primary"
            type="submit"
            block
            :loading="loading"
            size="large"
          >
            注册
          </t-button>
        </t-form-item>
      </t-form>

      <t-message
        v-if="error"
        theme="error"
        :duration="3000"
        :close-btn="true"
        @close-btn-click="error = ''"
      >
        {{ error }}
      </t-message>

      <t-message
        v-if="success"
        theme="success"
        :duration="3000"
        :close-btn="true"
        @close-btn-click="success = false"
      >
        注册成功！用户ID: {{ userId }}
      </t-message>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { authService } from '../services/auth'

const router = useRouter()
const form = ref({
  phone: '',
  password: '',
  verifyCode: '',
})
const loading = ref(false)
const error = ref('')
const success = ref(false)
const userId = ref('')

const phoneRules = [
  { required: true, message: '请输入手机号' },
  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
]

const passwordRules = [
  { required: true, message: '请输入密码' },
  { min: 6, message: '密码至少6位' },
]

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult !== true) {
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const response = await authService.register({
      phone: form.value.phone,
      password: form.value.password,
      verifyCode: form.value.verifyCode || undefined,
    })

    if (response.success && response.data) {
      success.value = true
      userId.value = response.data.userId
      MessagePlugin.success('注册成功！')
      setTimeout(() => {
        router.push('/account/open')
      }, 2000)
    } else {
      error.value = response.error?.message || '注册失败'
      MessagePlugin.error(error.value)
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '注册失败，请重试'
    MessagePlugin.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.page-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .register-page {
    padding: 12px;
  }

  .card-header h2 {
    font-size: 18px;
  }
}
</style>
