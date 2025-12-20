<template>
  <div class="open-account-page">
    <h1>证券账户开户</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>用户ID</label>
        <input v-model="form.userId" type="text" required placeholder="请输入用户ID" />
      </div>
      <div class="form-group">
        <label>真实姓名</label>
        <input v-model="form.realName" type="text" required placeholder="请输入真实姓名" />
      </div>
      <div class="form-group">
        <label>身份证号</label>
        <input v-model="form.idCard" type="text" required placeholder="请输入身份证号" />
      </div>
      <div class="form-group">
        <label>银行卡号</label>
        <input v-model="form.bankCard" type="text" required placeholder="请输入银行卡号" />
      </div>
      <div class="form-group">
        <label>银行名称</label>
        <input v-model="form.bankName" type="text" required placeholder="请输入银行名称" />
      </div>
      <button type="submit" :disabled="loading">提交开户</button>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">
        开户成功！账户ID: {{ accountId }}
        <br />
        <router-link to="/account/deposit">前往入金</router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { accountService } from '../services/account';

const form = ref({
  userId: '',
  realName: '',
  idCard: '',
  bankCard: '',
  bankName: '',
});
const loading = ref(false);
const error = ref('');
const success = ref(false);
const accountId = ref('');

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const response = await accountService.openAccount(form.value);

    if (response.success && response.data) {
      success.value = true;
      accountId.value = response.data.accountId;
    } else {
      error.value = response.error?.message || '开户失败';
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '开户失败，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.open-account-page {
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

