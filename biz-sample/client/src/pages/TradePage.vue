<template>
  <div class="trade-page">
    <h1>股票交易</h1>
    
    <div class="trade-section">
      <h2>买入</h2>
      <form @submit.prevent="handleBuy">
        <div class="form-group">
          <label>账户ID</label>
          <input v-model="buyForm.accountId" type="text" required placeholder="请输入账户ID" />
        </div>
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="buyForm.stockCode" type="text" required placeholder="如：000001" />
        </div>
        <div class="form-group">
          <label>股票名称</label>
          <input v-model="buyForm.stockName" type="text" required placeholder="如：平安银行" />
        </div>
        <div class="form-group">
          <label>买入数量</label>
          <input v-model.number="buyForm.quantity" type="number" required placeholder="请输入数量" min="1" />
        </div>
        <div class="form-group">
          <label>买入价格</label>
          <input v-model.number="buyForm.price" type="number" required placeholder="请输入价格" min="0.01" step="0.01" />
        </div>
        <button type="submit" :disabled="buyLoading">买入</button>
        <div v-if="buyError" class="error">{{ buyError }}</div>
        <div v-if="buySuccess" class="success">
          买入成功！
          <br />
          订单ID: {{ buyOrderId }}
          <br />
          当前余额: ¥{{ buyBalance }}
        </div>
      </form>
    </div>

    <div class="trade-section">
      <h2>卖出</h2>
      <form @submit.prevent="handleSell">
        <div class="form-group">
          <label>账户ID</label>
          <input v-model="sellForm.accountId" type="text" required placeholder="请输入账户ID" />
        </div>
        <div class="form-group">
          <label>股票代码</label>
          <input v-model="sellForm.stockCode" type="text" required placeholder="如：000001" />
        </div>
        <div class="form-group">
          <label>卖出数量</label>
          <input v-model.number="sellForm.quantity" type="number" required placeholder="请输入数量" min="1" />
        </div>
        <div class="form-group">
          <label>卖出价格</label>
          <input v-model.number="sellForm.price" type="number" required placeholder="请输入价格" min="0.01" step="0.01" />
        </div>
        <button type="submit" :disabled="sellLoading">卖出</button>
        <div v-if="sellError" class="error">{{ sellError }}</div>
        <div v-if="sellSuccess" class="success">
          卖出成功！
          <br />
          订单ID: {{ sellOrderId }}
          <br />
          当前余额: ¥{{ sellBalance }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { tradeService } from '../services/trade';

const buyForm = ref({
  accountId: '',
  stockCode: '',
  stockName: '',
  quantity: 0,
  price: 0,
});

const sellForm = ref({
  accountId: '',
  stockCode: '',
  quantity: 0,
  price: 0,
});

const buyLoading = ref(false);
const buyError = ref('');
const buySuccess = ref(false);
const buyOrderId = ref('');
const buyBalance = ref(0);

const sellLoading = ref(false);
const sellError = ref('');
const sellSuccess = ref(false);
const sellOrderId = ref('');
const sellBalance = ref(0);

const handleBuy = async () => {
  buyLoading.value = true;
  buyError.value = '';
  buySuccess.value = false;

  try {
    const response = await tradeService.buy(buyForm.value);

    if (response.success && response.data) {
      buySuccess.value = true;
      buyOrderId.value = response.data.orderId;
      buyBalance.value = response.data.balance;
    } else {
      buyError.value = response.error?.message || '买入失败';
    }
  } catch (err: any) {
    buyError.value = err.response?.data?.error?.message || '买入失败，请重试';
  } finally {
    buyLoading.value = false;
  }
};

const handleSell = async () => {
  sellLoading.value = true;
  sellError.value = '';
  sellSuccess.value = false;

  try {
    const response = await tradeService.sell(sellForm.value);

    if (response.success && response.data) {
      sellSuccess.value = true;
      sellOrderId.value = response.data.orderId;
      sellBalance.value = response.data.balance;
    } else {
      sellError.value = response.error?.message || '卖出失败';
    }
  } catch (err: any) {
    sellError.value = err.response?.data?.error?.message || '卖出失败，请重试';
  } finally {
    sellLoading.value = false;
  }
};
</script>

<style scoped>
.trade-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.trade-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: red;
  margin-top: 10px;
}

.success {
  color: green;
  margin-top: 10px;
}
</style>

