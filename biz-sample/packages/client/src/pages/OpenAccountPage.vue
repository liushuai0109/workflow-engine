<template>
  <div class="open-account-page">
    <t-card :bordered="false" class="page-card">
      <template #header>
        <div class="card-header">
          <t-icon name="file-add" size="24px" />
          <h2>证券账户开户</h2>
        </div>
      </template>

      <t-form :data="form" @submit="handleSubmit" label-width="100px">
        <t-form-item label="用户ID" name="userId" :rules="[{ required: true, message: '请输入用户ID' }]">
          <t-input
            v-model="form.userId"
            placeholder="请输入用户ID"
            clearable
          />
        </t-form-item>

        <t-form-item label="真实姓名" name="realName" :rules="[{ required: true, message: '请输入真实姓名' }]">
          <t-input
            v-model="form.realName"
            placeholder="请输入真实姓名"
            clearable
          />
        </t-form-item>

        <t-form-item label="身份证号" name="idCard" :rules="idCardRules">
          <t-input
            v-model="form.idCard"
            placeholder="请输入身份证号"
            clearable
            :maxlength="18"
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

        <t-form-item label="银行名称" name="bankName" :rules="[{ required: true, message: '请输入银行名称' }]">
          <t-input
            v-model="form.bankName"
            placeholder="请输入银行名称"
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
            提交开户
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
          <p>开户成功！</p>
          <p>账户ID: {{ accountId }}</p>
          <t-button
            theme="primary"
            variant="outline"
            size="small"
            @click="$router.push('/account/deposit')"
            style="margin-top: 8px;"
          >
            前往入金
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
  userId: '',
  realName: '',
  idCard: '',
  bankCard: '',
  bankName: '',
})
const loading = ref(false)
const error = ref('')
const success = ref(false)
const accountId = ref('')

const idCardRules = [
  { required: true, message: '请输入身份证号' },
  { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '请输入正确的身份证号' },
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
    const response = await accountService.openAccount(form.value)

    if (response.success && response.data) {
      success.value = true
      accountId.value = response.data.accountId
      MessagePlugin.success('开户成功！')
    } else {
      error.value = response.error?.message || '开户失败'
      MessagePlugin.error(error.value)
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || '开户失败，请重试'
    MessagePlugin.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.open-account-page {
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
  .open-account-page {
    padding: 12px;
  }

  .card-header h2 {
    font-size: 18px;
  }
}
</style>
