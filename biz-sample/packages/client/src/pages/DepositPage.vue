<template>
  <div class="deposit-page">
    <t-card :bordered="false" class="page-card">
      <template #header>
        <div class="card-header">
          <t-icon name="wallet" size="24px" />
          <h2>账户入金</h2>
        </div>
      </template>

      <t-form :data="form" @submit="handleSubmit" label-width="100px">
        <t-form-item label="账户ID" name="accountId" :rules="[{ required: true, message: '请输入账户ID' }]">
          <t-input
            v-model="form.accountId"
            placeholder="请输入账户ID"
            clearable
          />
        </t-form-item>

        <t-form-item label="入金金额" name="amount" :rules="amountRules">
          <t-input-number
            v-model="form.amount"
            placeholder="请输入金额"
            :min="0.01"
            :step="0.01"
            :decimal-places="2"
            style="width: 100%"
          />
        </t-form-item>

        <t-form-item label="银行卡号" name="bankCard" :rules="bankCardRules">
          <t-input
            v-model="form.bankCard"
            placeholder="请输入银行卡号"
            clearable
            :maxlength="19"
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
            确认入金
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
        :duration="5000"
        :close-btn="true"
        @close-btn-click="success = false"
      >
        <div class="success-content">
          <p>入金成功！</p>
          <p>交易ID: {{ transactionId }}</p>
          <p>当前余额: ¥{{ balance.toFixed(2) }}</p>
          <t-button
            theme="primary"
            variant="outline"
            size="small"
            @click="$router.push('/trade')"
            style="margin-top: 8px;"
          >
            前往交易
          </t-button>
        </div>
      </t-message>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { accountService } from '../services/account'

const form = ref({
  accountId: '',
  amount: 0,
  bankCard: '',
})
const loading = ref(false)
const error = ref('')
const success = ref(false)
const transactionId = ref('')
const balance = ref(0)

const amountRules = [
  { required: true, message: '请输入入金金额' },
  { type: 'number', min: 0.01, message: '金额必须大于0.01' },
]

const bankCardRules = [
  { required: true, message: '请输入银行卡号' },
  { pattern: /^\d{16,19}$/, message: '请输入正确的银行卡号' },
]

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult !== true) {
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const response = await accountService.deposit(form.value)

    if (response.success && response.data) {
      success.value = true
      transactionId.value = response.data.transactionId
      balance.value = response.data.balance
      MessagePlugin.success('入金成功！')
    } else {
      error.value = response.error?.message || '入金失败'
      MessagePlugin.error(error.value)
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '入金失败，请重试'
    MessagePlugin.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.deposit-page {
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

.success-content {
  line-height: 1.8;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .deposit-page {
    padding: 12px;
  }

  .card-header h2 {
    font-size: 18px;
  }
}
</style>
