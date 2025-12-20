<template>
  <div class="deposit-page">
    <h1>账户入金</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>账户ID</label>
        <input v-model="form.accountId" type="text" required placeholder="请输入账户ID" />
      </div>
      <div class="form-group">
        <label>入金金额</label>
        <input v-model.number="form.amount" type="number" required placeholder="请输入金额" min="0.01" step="0.01" />
      </div>
      <div class="form-group">
        <label>银行卡号</label>
        <input v-model="form.bankCard" type="text" required placeholder="请输入银行卡号" />
      </div>
      <button type="submit" :disabled="loading">确认入金</button>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">
        入金成功！
        <br />
        交易ID: {{ transactionId }}
        <br />
        当前余额: ¥{{ balance }}
        <br />
        <router-link to="/trade">前往交易</router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { accountService } from '../services/account';

const form = ref({
  accountId: '',
  amount: 0,
  bankCard: '',
});
const loading = ref(false);
const error = ref('');
const success = ref(false);
const transactionId = ref('');
const balance = ref(0);

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const response = await accountService.deposit(form.value);

    if (response.success && response.data) {
      success.value = true;
      transactionId.value = response.data.transactionId;
      balance.value = response.data.balance;
    } else {
      error.value = response.error?.message || '入金失败';
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '入金失败，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.deposit-page {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
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

