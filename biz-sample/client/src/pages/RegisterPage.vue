<template>
  <div class="register-page">
    <h1>用户注册</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>手机号</label>
        <input v-model="form.phone" type="tel" required placeholder="请输入手机号" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="form.password" type="password" required placeholder="请输入密码" />
      </div>
      <div class="form-group">
        <label>验证码（可选）</label>
        <input v-model="form.verifyCode" type="text" placeholder="请输入验证码" />
      </div>
      <button type="submit" :disabled="loading">注册</button>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">注册成功！用户ID: {{ userId }}</div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth';

const router = useRouter();
const form = ref({
  phone: '',
  password: '',
  verifyCode: '',
});
const loading = ref(false);
const error = ref('');
const success = ref(false);
const userId = ref('');

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  success.value = false;

  try {
    const response = await authService.register({
      phone: form.value.phone,
      password: form.value.password,
      verifyCode: form.value.verifyCode || undefined,
    });

    if (response.success && response.data) {
      success.value = true;
      userId.value = response.data.userId;
      setTimeout(() => {
        router.push('/account/open');
      }, 2000);
    } else {
      error.value = response.error?.message || '注册失败';
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '注册失败，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-page {
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

