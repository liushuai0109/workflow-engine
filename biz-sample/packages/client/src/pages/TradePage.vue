<template>
  <div class="trade-page">
    <t-tabs v-model="activeTab" theme="normal" :list="tabList" @change="handleTabChange">
      <template #buy>
        <t-card :bordered="false" class="trade-card">
          <template #header>
            <div class="card-header">
              <t-icon name="arrow-up" size="20px" style="color: #f56c6c" />
              <h3>买入股票</h3>
            </div>
          </template>

          <a-form :data="buyForm" @submit="handleBuy" label-width="100px">
            <a-form-item label="账户ID" name="accountId" :rules="[{ required: true, message: '请输入账户ID' }]">
              <t-input
                v-model="buyForm.accountId"
                placeholder="请输入账户ID"
                clearable
              />
            </a-form-item>

            <a-form-item label="股票代码" name="stockCode" :rules="[{ required: true, message: '请输入股票代码' }]">
              <t-input
                v-model="buyForm.stockCode"
                placeholder="如：000001"
                clearable
                :maxlength="6"
              />
            </a-form-item>

            <a-form-item label="股票名称" name="stockName" :rules="[{ required: true, message: '请输入股票名称' }]">
              <t-input
                v-model="buyForm.stockName"
                placeholder="如：平安银行"
                clearable
              />
            </a-form-item>

            <a-form-item label="买入数量" name="quantity" :rules="quantityRules">
              <t-input-number
                v-model="buyForm.quantity"
                placeholder="请输入数量"
                :min="1"
                :step="100"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="买入价格" name="price" :rules="priceRules">
              <t-input-number
                v-model="buyForm.price"
                placeholder="请输入价格"
                :min="0.01"
                :step="0.01"
                :decimal-places="2"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item>
              <t-button
                theme="primary"
                type="submit"
                block
                :loading="buyLoading"
                size="large"
                style="background-color: #f56c6c; border-color: #f56c6c;"
              >
                买入
              </t-button>
            </a-form-item>
          </a-form>

          <t-message
            v-if="buyError"
            theme="error"
            :duration="3000"
            :close-btn="true"
            @close-btn-click="buyError = ''"
          >
            {{ buyError }}
          </t-message>

          <t-message
            v-if="buySuccess"
            theme="success"
            :duration="5000"
            :close-btn="true"
            @close-btn-click="buySuccess = false"
          >
            <div class="success-content">
              <p>买入成功！</p>
              <p>订单ID: {{ buyOrderId }}</p>
              <p>当前余额: ¥{{ buyBalance.toFixed(2) }}</p>
            </div>
          </t-message>
        </t-card>
      </template>

      <template #sell>
        <t-card :bordered="false" class="trade-card">
          <template #header>
            <div class="card-header">
              <t-icon name="arrow-down" size="20px" style="color: #67c23a" />
              <h3>卖出股票</h3>
            </div>
          </template>

          <a-form :data="sellForm" @submit="handleSell" label-width="100px">
            <a-form-item label="账户ID" name="accountId" :rules="[{ required: true, message: '请输入账户ID' }]">
              <t-input
                v-model="sellForm.accountId"
                placeholder="请输入账户ID"
                clearable
              />
            </a-form-item>

            <a-form-item label="股票代码" name="stockCode" :rules="[{ required: true, message: '请输入股票代码' }]">
              <t-input
                v-model="sellForm.stockCode"
                placeholder="如：000001"
                clearable
                :maxlength="6"
              />
            </a-form-item>

            <a-form-item label="卖出数量" name="quantity" :rules="quantityRules">
              <t-input-number
                v-model="sellForm.quantity"
                placeholder="请输入数量"
                :min="1"
                :step="100"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="卖出价格" name="price" :rules="priceRules">
              <t-input-number
                v-model="sellForm.price"
                placeholder="请输入价格"
                :min="0.01"
                :step="0.01"
                :decimal-places="2"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item>
              <t-button
                theme="primary"
                type="submit"
                block
                :loading="sellLoading"
                size="large"
                style="background-color: #67c23a; border-color: #67c23a;"
              >
                卖出
              </t-button>
            </a-form-item>
          </a-form>

          <t-message
            v-if="sellError"
            theme="error"
            :duration="3000"
            :close-btn="true"
            @close-btn-click="sellError = ''"
          >
            {{ sellError }}
          </t-message>

          <t-message
            v-if="sellSuccess"
            theme="success"
            :duration="5000"
            :close-btn="true"
            @close-btn-click="sellSuccess = false"
          >
            <div class="success-content">
              <p>卖出成功！</p>
              <p>订单ID: {{ sellOrderId }}</p>
              <p>当前余额: ¥{{ sellBalance.toFixed(2) }}</p>
            </div>
          </t-message>
        </t-card>
      </template>
    </t-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { tradeService } from '../services/trade'

const activeTab = ref('buy')
const tabList = [
  { value: 'buy', label: '买入', icon: 'arrow-up' },
  { value: 'sell', label: '卖出', icon: 'arrow-down' },
]

const buyForm = ref({
  accountId: '',
  stockCode: '',
  stockName: '',
  quantity: 0,
  price: 0,
})

const sellForm = ref({
  accountId: '',
  stockCode: '',
  quantity: 0,
  price: 0,
})

const buyLoading = ref(false)
const buyError = ref('')
const buySuccess = ref(false)
const buyOrderId = ref('')
const buyBalance = ref(0)

const sellLoading = ref(false)
const sellError = ref('')
const sellSuccess = ref(false)
const sellOrderId = ref('')
const sellBalance = ref(0)

const quantityRules = [
  { required: true, message: '请输入数量' },
  { type: 'number', min: 1, message: '数量必须大于0' },
]

const priceRules = [
  { required: true, message: '请输入价格' },
  { type: 'number', min: 0.01, message: '价格必须大于0.01' },
]

const handleTabChange = (value: string) => {
  activeTab.value = value
}

const handleBuy = async ({ validateResult }: any) => {
  if (validateResult !== true) {
    return
  }

  buyLoading.value = true
  buyError.value = ''
  buySuccess.value = false

  try {
    const response = await tradeService.buy(buyForm.value)

    if (response.success && response.data) {
      buySuccess.value = true
      buyOrderId.value = response.data.orderId
      buyBalance.value = response.data.balance
      MessagePlugin.success('买入成功！')
    } else {
      buyError.value = response.error?.message || '买入失败'
      MessagePlugin.error(buyError.value)
    }
  } catch (err: any) {
    buyError.value = err.response?.data?.error?.message || '买入失败，请重试'
    MessagePlugin.error(buyError.value)
  } finally {
    buyLoading.value = false
  }
}

const handleSell = async ({ validateResult }: any) => {
  if (validateResult !== true) {
    return
  }

  sellLoading.value = true
  sellError.value = ''
  sellSuccess.value = false

  try {
    const response = await tradeService.sell(sellForm.value)

    if (response.success && response.data) {
      sellSuccess.value = true
      sellOrderId.value = response.data.orderId
      sellBalance.value = response.data.balance
      MessagePlugin.success('卖出成功！')
    } else {
      sellError.value = response.error?.message || '卖出失败'
      MessagePlugin.error(sellError.value)
    }
  } catch (err: any) {
    sellError.value = err.response?.data?.error?.message || '卖出失败，请重试'
    MessagePlugin.error(sellError.value)
  } finally {
    sellLoading.value = false
  }
}
</script>

<style scoped>
.trade-page {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.trade-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.success-content {
  line-height: 1.8;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .trade-page {
    padding: 12px;
  }

  .card-header h3 {
    font-size: 16px;
  }
}
</style>
